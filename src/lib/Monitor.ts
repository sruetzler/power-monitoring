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
        users.forEach(user=>{
            this.users[user] = new User(user, this.config, this.mqtt);
        });
        this.config.on("users", (users)=>{
            this.onUsersChanged(users);
        });
    }
    async stop(){
        Object.keys(this.users).forEach(user=>this.users[user].close());
        await this.mqtt.close();
    }
    private onUsersChanged(users:string[]){
        const oldUsers = this.users;
        users.forEach(user=>{
            if (oldUsers[user]) delete oldUsers[user];
            else this.users[user] = new User(user, this.config, this.mqtt);
        });
        Object.keys(oldUsers).forEach(user=>{
            this.users[user].close();
            delete this.users[user];
        });
    }
}