import Switch from "lib/Switch";
import { formatDate, IMode } from "lib/definition";
import { DeviceConfig, LearningModeData, Config } from "lib/Config";
import { writeFile, mkdirp, appendFile } from "fs-extra";

const pathPrefix = "./learning";
export default class Learning implements IMode{
    private path:string;
    private data:LearningModeData;
    constructor(private _switch:Switch,private config:DeviceConfig, private configClass:Config, private userId:string, private device:string){
        console.log("new Learning", device);
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
        console.log("delete Learning", this.device);
    }
    async close(){
        console.log("close Learning", this.device);
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
        await writeFile(`${this.path}/${this.data.fileName}`,"0 0 =WENN(A1>0;WENN(A2>0;WENN(B1=0;A2-A1;0);0);0) =MAX(C:C)\n", "UTF8");
    }
    private async saveCurrent(current:number){
        const now = new Date();
        const time = Math.round((now.getTime() - this.data.startTime)/1000);
        const c = current.toString().replace(/\./g,",");
        await appendFile(`${this.path}/${this.data.fileName}`, `${time} ${c}\n`, {encoding :"UTF8"})
    }
}

