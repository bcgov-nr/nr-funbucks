import {Command, Flags} from '@oclif/core';
import * as fs from 'fs';
const path = require('path');

export default class Monitors extends Command {
  static description = 'generate monitor configuration'

  static examples = [
    '<%= config.bin %> <%= command.id %>',
  ]

  static args = [{name: 'file'}]

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(Monitors);
    const monitorJson = function(): string {
      const ipFile = fs.readFileSync(path.join('scripts','fluentbit_agents.csv'), 'utf-8').trim();
      const serverList = ipFile.split('\n');
      let op = '[\n  ';
      for (let i in serverList) {
        const server = serverList[i].split(',')[0];
        const agentCount = Number(serverList[i].split(',')[1]);
        for (let j=0; j<agentCount; j++)
          { 
              op += "{\n  ";
              op += '  "name": "nrm_' + server + '_fluent-bit.' + j + '",'
              op += "\n  ";
              op += '  "server": "'+ server + '",'
              op += "\n  ";
              op += '  "agent": ' + '"fluent-bit.' + j + '"';
              op += "\n  ";
              op += "}";
              if(!(Number(i)>=serverList.length-1 && j==agentCount-1)) {
                  op += ",\n  ";
              }
          }  
      }
      op +=  "\n]";
      return op;
  }
  
  fs.writeFile('output/monitors.json', monitorJson(),  function(err) {
      if (err) {
          return console.error(err);
      }
      console.log("monitors.json created in the output folder");
  });
  
  }
}
