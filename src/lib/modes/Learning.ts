import Switch from "lib/Switch";
import { IMode } from "lib/definition";
import { DeviceConfig, LearningModeData, Config } from "lib/Config";
import { writeFile, mkdirp, appendFile } from "fs-extra";

const pathPrefix = "./learning";
export default class Learning implements IMode{
    private path:string;
    private data:LearningModeData;
    constructor(private _switch:Switch,private config:DeviceConfig, private configClass:Config, private userId:string, private device:string){
        this.path = `${pathPrefix}/${this.config.topic}`;
        this.getData();
        this._switch.on("state", async (state:boolean)=>{
            await this.onState(state);
        });
        this._switch.on("current", async (current:number)=>{
            if (this.data.learning) await this.saveCurrent(current);
        });
    }
    
    private async onState(state:boolean){
        if (!this.data.learning && state) await this.startLearning();
        if (this.data.learning && !state) await this.stopLearning();
        await this.saveData();
    }
    private getData(){
        this.data = this.config.modeData as LearningModeData;
        if (this.data?.type === "learning") return;
        this.initData();
    }
    private initData(){
        this.data = {
            type : "learning",
            learning : false,
            startTime : 0,
            fileName : null,
        }
    }
    async open(){
        await this.onState(this._switch.getState());
    }
    async delete(){
        await close();
    }
    async close(){

    }
    private async saveData(){
        await this.configClass.saveModeData(this.userId, this.device, this.data);
    }
    private async stopLearning(){
        this.initData();
    }
    private async startLearning(){
        const now = new Date();
        this.data.fileName=`${formatDate(now)}.csv`;
        this.data.startTime = now.getTime();
        this.data.learning = true;
        await mkdirp(`${this.path}`);
        await writeFile(`${this.path}/${this.data.fileName}`,"0;0\n", "UTF8");
    }
    private async saveCurrent(current:number){
        const now = new Date();
        const time = Math.round((now.getTime() - this.data.startTime)/1000);
        const c = current.toString().replace(/\./g,",");
        await appendFile(`${this.path}/${this.data.fileName}`, `${time};${c}\n`, {encoding :"UTF8"})
    }
}

function formatDate(date:Date):string{
    const year = fixLength('' + date.getUTCFullYear());
    const month = fixLength('' + (date.getUTCMonth() + 1));
    const day = fixLength('' + date.getUTCDate());
    const hour = fixLength('' + date.getUTCHours());
    const minute = fixLength('' + date.getUTCMinutes());
    const second = fixLength('' + date.getUTCSeconds());

    return `${year}${month}${day}${hour}${minute}${second}`;
}

function fixLength(value:string){
    if (value.length < 2) 
    value = '0' + value;
    return value;
}
