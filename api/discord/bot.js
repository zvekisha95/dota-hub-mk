// api/bot.js – Zvekisha Discord Bot (работи на Vercel!)
import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js';

const TOKEN = process.env.DISCORD_TOKEN;  // ќе го ставиш во Vercel Environment Variables
const SITE = "https://zvekisha.mk";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
  console.log(`Zvekisha Bot онлајн: ${client.user.tag}`);

  const commands = [
    { name: 'live', description: 'Кој игра Dota 2 сега' },
    { name: 'top10', description: 'Топ 10 по MMR' },
    { name: 'tema', description: 'Последна тема од форумот' }
  ];
  await client.application.commands.set(commands);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  await interaction.deferReply();

  try {
    if (interaction.commandName === 'live') {
      const res = await fetch(`${SITE}/api/discord/live`);
      const data = await res.json();
      if (!data.length) return interaction.editReply("Никој не игра моментално.");

      const embed = new EmbedBuilder()
        .setTitle("Активни мечеви")
        .setColor(0x22c55e)
        .setDescription(data.map(p => `• [**${p.username}**](https://zvekisha.mk/profile.html?id=${p.uid})`).join('\n'));
      interaction.editReply({ embeds: [embed] });
    }

    if (interaction.commandName === 'top10') {
      const res = await fetch(`${SITE}/api/discord/top10`);
      const data = await res.json();
      if (!data.length) return interaction.editReply("Нема MMR податоци.");

      const embed = new EmbedBuilder()
        .setTitle("Топ 10 по MMR")
        .setColor(0x60a5fa)
        .setDescription(data.map((p, i) => `${i+1}. **${p.username}** – ${p.mmr} MMR`).join('\n'));
      interaction.editReply({ embeds: [embed] });
    }

    if (interaction.commandName === 'tema') {
      const res = await fetch(`${SITE}/api/discord/latest-thread`);
      const d = await res.json();
      if (!d.id) return interaction.editReply("Нема објавени теми.");
      interaction.editReply(`Последна тема:\n**${d.title}**\nhttps://zvekisha.mk/thread.html?id=${d.id}`);
    }
  } catch (e) {
    interaction.editReply("Грешка при поврзување со сајтот.");
  }
});

// ОВА Е НАЈВАЖНОТО – Vercel држи функција жива само 10 сек, па ботот мора да остане буден
client.login(TOKEN);
export default function handler() {
  return new Response("Zvekisha Bot е активен");
}
