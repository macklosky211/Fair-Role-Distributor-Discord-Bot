const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('distributeroles')
        .setDescription('distribute Roles to players in the specified voicechat')
        .addStringOption(option =>
            option.setName('roledistribution')
                .setDescription('use format ( #/#/# ) must have 3 inputs, but may input (*/*/0) as a valid answer.')
        ),
        
    async execute(interaction, client, poll_messages) {
        const message = await interaction.reply({ content: "### React to choose your role(s).\n> 🦾: Tank | 🤡: Damage | 😍: Healther\n> Whenever you react with 🤤 roles will be distributed.\n> The ☑️ reaction will delete this message.\n-# NOTE: If you select multiple roles you **may** only recieve 1.", fetchReply: true });
        await message.react('🦾');
        await message.react('🤡');
        await message.react('😍');
        await message.react('🤤');
        await message.react('☑️');
        

        /**
         * for(player in players):
         *  pick = rand(0,3)
         *  while players[player][0] == 0
         *      if(players[player][pick+1] == true):
         *          players[player][0] = pick
         *      else:
         *          pick = (pick+1) % 3
         */
        message.poll_data = new Map();
        message.assignedRoles = interaction.options.getString('roledistribution') || null;


        await poll_messages.set(message.id, message);

    }
}