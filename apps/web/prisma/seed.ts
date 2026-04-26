import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { getGameDetails } from "../src/lib/bgg";
import { translateToFrench } from "../src/lib/translate";

const prisma = new PrismaClient();

const GAMES = [
  { name: "Catan",                      category: "initié",  bggId: "13",    minPlayers: 3, maxPlayers: 4, duration: 90,  minAge: 10 },
  { name: "Ticket to Ride",             category: "famille", bggId: "9209",  minPlayers: 2, maxPlayers: 5, duration: 60,  minAge: 8  },
  { name: "7 Wonders",                  category: "initié",  bggId: "68448", minPlayers: 2, maxPlayers: 7, duration: 30,  minAge: 10 },
  { name: "Dobble",                     category: "famille", bggId: "63268", minPlayers: 2, maxPlayers: 8, duration: 15,  minAge: 6  },
  { name: "Exit : La Cabane Abandonnée",category: "escape",  bggId: "203416",minPlayers: 1, maxPlayers: 6, duration: 60,  minAge: 10 },
];

async function main() {
  // Utilisateurs
  const adminHash = await bcrypt.hash("Admin1234!", 12);
  const userHash  = await bcrypt.hash("User1234!", 12);

  await prisma.user.upsert({
    where: { email: "admin@bred.fr" },
    update: {},
    create: { email: "admin@bred.fr", name: "Administrateur", password: adminHash, role: "ADMIN" },
  });
  await prisma.user.upsert({
    where: { email: "jean.dupont@bred.fr" },
    update: {},
    create: { email: "jean.dupont@bred.fr", name: "Jean Dupont", password: userHash, role: "USER" },
  });

  // Jeux : fetch BGG pour images + infos
  for (const game of GAMES) {
    console.log(`⏳ Fetch BGG : ${game.name} (${game.bggId})...`);
    let bgg = null;
    try {
      bgg = await getGameDetails(game.bggId);
      await new Promise((r) => setTimeout(r, 600));
    } catch { /* BGG unavailable — on continue sans image */ }

    const summaryFr = bgg?.summary ? await translateToFrench(bgg.summary) : null;

    const data = {
      category:   game.category,
      minPlayers: bgg?.minPlayers  ?? game.minPlayers,
      maxPlayers: bgg?.maxPlayers  ?? game.maxPlayers,
      duration:   bgg?.duration    ?? game.duration,
      minAge:     bgg?.minAge      ?? game.minAge,
      summary:    summaryFr,
      coverUrl:   bgg?.coverUrl    ?? null,
      bggId:      game.bggId,
    };

    const existing = await prisma.game.findFirst({ where: { name: game.name } });
    if (existing) {
      await prisma.game.update({ where: { id: existing.id }, data });
      console.log(`  ✔ Mis à jour`);
    } else {
      await prisma.game.create({ data: { name: game.name, type: "Jeu de société", ...data } });
      console.log(`  ✔ Créé`);
    }
  }

  console.log("\n✅ Seed terminé — admin: admin@bred.fr / Admin1234!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
