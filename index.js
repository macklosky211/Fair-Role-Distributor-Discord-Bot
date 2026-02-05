const { Client, Events, SlashCommandBuilder, Collection, GatewayIntentBits, Intents, Partials, REST, Routes } = require("discord.js");
const { token, clientID, testchannel } = require("./config.json");
const fs = require('node:fs');
const path = require('node:path');

const client = new Client({
    intents: [
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.Guilds
    ],
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction
    ]
});
client.commands = new Collection();

/**
 * Storage Variables
 */
// client.poll_messages = new Map();
const poll_messages = new Map();

/*********************************
 * Interactions & main bot usage *
 *********************************/

client.once(Events.ClientReady, readyClient => {
    register_commands();
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.on(Events.MessageReactionAdd, async (reaction, user) => {
    if (user.id === clientID) { return; } // we dont care when the bot interacts with its own messages.
    if (reaction.partial) { try { await reaction.fetch() } catch (e) { console.error(e); return; } }
    if (reaction.emoji.name === '☑️') { poll_messages.delete(reaction.message.id); reaction.message.delete(); } // if the reaction was 'exit' emoji then delete the message.
    if (!poll_messages.has(reaction.message.id)) { console.log('[WARNING] Reaction to something that was not a poll_message'); return; }

    if (reaction.emoji.name === '🤤') {
        // Storage: 
        const queue = new LinkedList();

        // Appends each user. (append is done in order to allow for easy popping.)
        const poll_data = poll_messages.get(reaction.message.id).poll_data;
        console.log(poll_data);

        for (const user_data of poll_data) {
            user_data[1].set('assigned_role', -1);
            queue.append(user_data);
        }

        var parsed_assigned_roles = [];
        if(poll_messages.get(reaction.message.id).assignedRoles != null){
            const split = poll_messages.get(reaction.message.id).assignedRoles.split("/");
            
            for(var i = 0; i < split.length; i++){
                parsed_assigned_roles[i] = parseInt(split[i]);
            }
        }

        // Assign each user to their closest preference.
        const assigned = [0, 0, 0];                                                            // # of people current assigned to role [ A: 0, B: 0, C: 0]
        const required = parsed_assigned_roles.length > 0 ? parsed_assigned_roles : [2, 2, 2]; // MAX # of people for that role.       [ A: 1, B: 2, C: 0]
        var user_node = queue.head;

        
        console.log(queue);
        // PRIORITY
        while (user_node != null) {
            const rand = Math.floor(Math.random() * (assigned.length - 1));
            for (var i = 0; i < assigned.length; i++) {
                const rounded_rand = (rand + i) % assigned.length;
                if (user_node.data[1].get('prefs')[rounded_rand] == 1 && assigned[rounded_rand] < required[rounded_rand]) {
                    user_node.data[1].set('assigned_role', rounded_rand);
                    user_node.data[1].set('time_since', 0);
                    user_node.data[1].set('time_as_selected', user_node.data[1].get('time_as_selected') + 1);
                    assigned[rounded_rand] += 1;
                    queue.remove(user_node.data);
                    console.log(`[Priority] ${user_node.data[0]} -> ${rounded_rand}`);
                    console.log(queue);
                    break;
                }
            }
            user_node = user_node.next;
        }
        // AUTOFILL
        for (var i = 0; i < assigned.length; i++) {
            while (assigned[i] < required[i]) {
                const user_node = queue.pop();
                if(user_node == null){ console.error(`[ERROR] User_node was null`); return; }
                user_node.data[1].set('assigned_role', i);
                user_node.data[1].set('time_since', user_node.data[1].get('time_since') + 1);
                user_node.data[1].set('time_as_selected', 0);
                assigned[i] += 1;
                console.log(`[Autofill] ${user_node.data[0]} -> ${i}`);
            }
        }

        // now we need to assign roles to everyone based on who hasnt gotten their roles first.w
        console.log(queue);
        console.log(`assigned: ${assigned}`);
        console.log(`required: ${required}`);
        console.log(poll_messages.get(reaction.message.id).poll_data);

        var reaction_message = "# Roles\n";
        for(const [user_id, user_data] of poll_messages.get(reaction.message.id).poll_data){
            const user = await (reaction.message.guild.members.fetch(user_id));
            const assigned_role = user_data.get('assigned_role');
            var role_symbol = "";
            if(assigned_role == 0){ role_symbol = '🦾'; }
            else if(assigned_role == 1){ role_symbol = '🤡'; }
            else if(assigned_role == 2){ role_symbol = '😍'; }
            else { role_symbol = assigned_role; }
            reaction_message += `> ${user.nickname || user.displayName} -> ${role_symbol}\n`;
        }
        reaction.message.edit(reaction_message);
        return;
    }

    const poll_message = poll_messages.get(reaction.message.id);
    const poll_data = poll_message.poll_data;             // poll_data = Map( 'player_id' -> { prefs: [1,0,1], assigned_role: 'ROLE_A'}, time_since: 3 )
    if (!poll_data.has(user.id)) {
        await poll_data.set(user.id, new Map());
    }
    const player_data = poll_data.get(user.id);
    if (!player_data.has('prefs') && !player_data.has('assigned_role')) {
        player_data.set('prefs', new Array(3).fill(0));               // prefs            : [0, 0, 0]
        player_data.set('assigned_role', -1);                         // Assigned_role    : 1
        player_data.set('time_since', 0);                             // time_since       : 0
        player_data.set('time_as_selected', 0);                       // time_as_selected : 0
    }

    switch (reaction.emoji.name) {
        case '🦾': player_data.get('prefs')[0] = 1; break;
        case '🤡': player_data.get('prefs')[1] = 1; break;
        case '😍': player_data.get('prefs')[2] = 1; break;
    }

});

client.on(Events.MessageReactionRemove, async (reaction, user) => {
    if (user.id === clientID) { return; } // we dont care when the bot interacts with its own messages.
    if (reaction.partial) { try { await reaction.fetch() } catch (e) { console.error(e); return; } }
    if (!poll_messages.has(reaction.message.id)) { console.log('[WARNING] Reaction to something that was not a poll_message'); return; }

    const poll_message = poll_messages.get(reaction.message.id);
    const poll_data = poll_message.poll_data;             // poll_data = Map( 'player_id' -> { prefs: [1,0,1], assigned_role: 'ROLE_A'} )
    const player_data = poll_data.get(user.id);
    switch (reaction.emoji.name) {
        case '🦾': player_data.get('prefs')[0] = 0; break;
        case '🤡': player_data.get('prefs')[1] = 0; break;
        case '😍': player_data.get('prefs')[2] = 0; break;
    }

});

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) { return; }
    try {
        await (client.commands.get(interaction.commandName)).execute(interaction, client, poll_messages);
    } catch (e) {
        await interaction.reply({ content: `[ERROR] ${e}` });
    }
});


client.login(token);

/****************************
 * Helper Functions Section *
 ****************************/

function register_commands() {
    const commands = [];
    const folder_path = path.join(__dirname, 'commands');
    for (const file of fs.readdirSync(folder_path).filter(file => file.endsWith('.js'))) {
        const command = require(path.join(folder_path, file));
        if ('data' in command && 'execute' in command) {
            commands.push(command.data.toJSON());
            client.commands.set(command.data.name, command);
        }
        else { console.error('[ERROR] File did not have \'data\' or \'execute\''); }
    }
    const rest = new REST().setToken(token);
    (async () => { await rest.put(Routes.applicationGuildCommands(clientID, testchannel), { body: commands }).then(() => console.log(`updated guild commands`)); })();
}

class Node {
    constructor(data) {
        this.data = data;
        this.next = null;
    }
}

class LinkedList {
    constructor() {
        this.head = null;
        this.size = 0;
    }
    prepend(data) {
        const newNode = new Node(data);
        newNode.next = this.head;
        this.head = newNode;
        this.size++;
    }
    append(data) {
        const newNode = new Node(data);

        if (!this.head) {
            this.head = newNode;
        } else {
            const time_since = data[1].get('time_since');
            let current = this.head;
            
            if(time_since > current.data[1].get('time_since')){
                newNode.next = current;
                this.head = newNode;
                this.size++;
                return;
            }

            while (current.next && time_since < current.next.data[1].get('time_since')) {
                current = current.next;
            }
            while(current.next && time_since == current.next.data[1].get('time_since') && data[1].get('time_as_selected') > current.next.data[1].get('time_as_selected')){
                current = current.next;
            }
            newNode.next = current.next;
            current.next = newNode;
        }
        this.size++;
    }
    remove(data) {
        if (!this.head) {
            return;
        }

        if (this.head.data === data) {
            this.head = this.head.next;
            this.size--;
            return;
        }

        let current = this.head;
        let previous = null;

        while (current) {
            if (current.data === data) {
                previous.next = current.next;
                this.size--;
                return;
            }

            previous = current;
            current = current.next;
        }
    }
    size() {
        return this.size;
    }
    pop() {
        if (this.head == null) { console.error("[WARNING] head of linked list was null"); return; }
        const oldHead = this.head;
        if(oldHead.next != null){
            this.head = oldHead.next;
        } else {
            this.head = null;
        }
        this.size--;
        return oldHead;
    }
}