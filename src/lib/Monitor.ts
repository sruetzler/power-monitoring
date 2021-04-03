import { Config } from "./Config";
import Mqtt from "./Mqtt";
import User from "./User";


export default class Monitor{
    private mqtt:Mqtt
    private users : {[userId:string]:User} = {};
    constructor(private config:Config){
        this.mqtt = new Mqtt(config);
    }
    async start(){
        await this.mqtt.open();
        const users = this.config.get("users");
        for (let i=0; i<users.length; i++){
            const user = users[i];
            this.users[user] = new User(user, this.config, this.mqtt);
            await this.users[user].open();
        }
        this.config.on("users", (users)=>{
            this.onUsersChanged(users);
        });
    }
    async stop(){
        for (let user in this.users) await this.users[user].close();
        await this.mqtt.close();
    }
    private async onUsersChanged(users:string[]){
        const oldUsers = Object.keys(this.users).reduce((users,user)=>{
            users[user]=true;
            return users;
        },{});
        for (let i=0; i<users.length; i++){
            const user = users[i];
            if (oldUsers[user]) delete oldUsers[user];
            else{
                this.users[user] = new User(user, this.config, this.mqtt);
                await this.users[user].open();
            }
        }
        Object.keys(oldUsers).forEach(user=>{
            this.users[user].delete();
            delete this.users[user];
        });
    }
}