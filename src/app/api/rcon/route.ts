import { NextResponse } from 'next/server';
import dgram from 'dgram';

export const dynamic = 'force-dynamic';

const SERVER_IP = process.env.RCON_HOST || '127.0.0.1';
const SERVER_PORT = parseInt(process.env.RCON_PORT || '28100', 10);
const RCON_PASS = process.env.RCON_PASSWORD || '';

function sendRcon(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = dgram.createSocket('udp4');
    let isClosed = false;
    
    const closeClient = () => {
      if (!isClosed) {
        isClosed = true;
        try { client.close(); } catch (e) {}
      }
    };

    const timer = setTimeout(() => {
      closeClient();
      resolve(""); 
    }, 1000);

    client.on('error', (err) => {
      clearTimeout(timer);
      closeClient();
      reject(err);
    });

    client.on('message', (msg) => {
      clearTimeout(timer);
      const text = msg.toString('latin1');
      closeClient();
      
      if (text.startsWith('\xff\xff\xff\xffprint\n')) {
        resolve(text.substring(10).trim());
      } else {
        resolve(text.trim());
      }
    });

    const packet = Buffer.from(`\xff\xff\xff\xffrcon ${RCON_PASS} ${command}`, 'latin1');
    client.send(packet, SERVER_PORT, SERVER_IP, (err) => {
      if (err) {
        clearTimeout(timer);
        closeClient();
        reject(err);
      }
    });
  });
}

function cleanStr(s: string): string {
  // Remove CoD4 color codes ^0-^9
  return s.replace(/\^[0-9]/g, '').trim();
}

export async function GET() {
  try {
    const statusResp = await sendRcon('status');
    if (!statusResp) {
      return NextResponse.json({ online: false }, { status: 200 });
    }

    const lines = statusResp.split(/\r?\n/);
    const info = {
      online: true,
      map: 'Offline',
      hostname: 'CoD4 Server',
      allies_score: 0,
      axis_score: 0,
      players: [] as any[]
    };

    for (const line of lines) {
      if (line.startsWith('map')) {
        info.map = line.split(':').pop()?.trim() || 'Offline';
      } else if (line.startsWith('hostname')) {
        info.hostname = line.split(':').pop()?.trim() || 'CoD4 Server';
      }
    }

    const alliesResp = await sendRcon('t_allies_score');
    const axisResp = await sendRcon('t_axis_score');

    const m1 = alliesResp.match(/"t_allies_score"\s+is:\s*"(\d+)/);
    if (m1) info.allies_score = parseInt(m1[1]);

    const m2 = axisResp.match(/"t_axis_score"\s+is:\s*"(\d+)/);
    if (m2) info.axis_score = parseInt(m2[1]);

    const liveStatsResp = await sendRcon('live_stats');
    const m_ls = liveStatsResp.match(/"live_stats"\s+is:\s*"([^"]*)"/);
    
    if (m_ls) {
      const rawStats = m_ls[1];
      const playerStrings = rawStats.split(';');
      
      for (const pStr of playerStrings) {
        if (!pStr.trim()) continue;
        
        const parts = pStr.split('|');
        if (parts.length >= 7) {
          try {
            const slot = parseInt(parts[0]);
            const rawName = parts[1];
            const name = cleanStr(rawName);
            const rawTeam = cleanStr(parts[2]).toLowerCase();
            const kills = parseInt(parts[3]);
            const deaths = parseInt(parts[4]);
            const score = parseInt(parts[5]);
            const ping = parseInt(parts[6]);
            
            let team = "spectator";
            if (["allies", "marines"].includes(rawTeam)) team = "allies";
            else if (["axis", "opfor"].includes(rawTeam)) team = "axis";

            info.players.push({
              slot, name, score, ping, team, kills, deaths
            });
          } catch (e) {
            // Ignore parsing errors for individual players
          }
        }
      }
    }

    return NextResponse.json(info, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0' // Prevent caching!
      }
    });

  } catch (err) {
    return NextResponse.json({ online: false, error: String(err) }, { status: 500 });
  }
}
