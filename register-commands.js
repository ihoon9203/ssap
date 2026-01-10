
const dotenv = require('dotenv');
// Load both .env and .env.local
dotenv.config();
dotenv.config({ path: '.env.local' });

const { REST, Routes, SlashCommandBuilder } = require('discord.js');

if (!process.env.DISCORD_TOKEN) {
    console.error('❌ Error: DISCORD_BOT_TOKEN is missing. Please check your .env or .env.local file.');
    process.exit(1);
}

const commands = [
    {
        name: 'ssap-connect',
        description: 'Connect this Discord channel to a SSAP schedule',
        options: [
            {
                name: 'invite_code',
                description: 'Paste the link command (e.g., schedule_id:...)',
                type: 3, // STRING
                required: true,
            },
        ],
    },
    {
        name: '연동해제',
        description: '연동된 스케줄을 해제합니다.',
    },
    {
        name: '알림설정',
        description: '알림 설정을 변경합니다.',
    },
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationCommands(process.env.DISCORD_APP_ID),
            { body: commands },
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();
