import { Command, Flags } from "@oclif/core";
import * as fs from "fs";
const path = require("path");
const crypto = require('crypto');
const QUERY_LEVEL_TRIGGER_ID_1 = 1;
const TEAMS_CHANNEL_ACTION_ID_2 = 2;
const AUTOMATION_QUEUE_ACTION_ID_3 = 3;
const JSON_FORMAT_SPACE_COUNT = 2;
const ID_MAX_LENGTH = 20;

export default class Monitors extends Command {
  static description = "generate monitor configuration";

  static examples = ["<%= config.bin %> <%= command.id %>"];

  static args = [{ name: "filePath" }];

  public async run(): Promise<void> {

    type Monitor = {
      name: string;
      server: string;
      agent: string;
      query_level_trigger_id: number;
      teams_channel_action_id: number;
      automation_queue_action_id: number;
    };

    const { args, flags } = await this.parse(Monitors);

    const filePath = args["filePath"];
    const monitorJson = function (): string {
      let monitorsList: Monitor[] = [];
      const ipFile = fs
        .readFileSync(filePath, "utf-8")
        .trim();
      const serverList = ipFile.split("\n");
      for (let i of serverList) {
        const serverName = i.split(",")[0];
        const agentCount = Number(i.split(",")[1]);
        for (let j = 0; j < agentCount; j++) {
          const monitor: Monitor = {
            name: "nrm_" + serverName + "_fluent-bit." + j,
            server: serverName,
            agent: "fluent-bit." + j,
            query_level_trigger_id: crypto.createHash('sha256').update(serverName+j+QUERY_LEVEL_TRIGGER_ID_1).digest('hex').substring(0,ID_MAX_LENGTH),
            teams_channel_action_id: crypto.createHash('sha256').update(serverName+j+TEAMS_CHANNEL_ACTION_ID_2).digest('hex').substring(0,ID_MAX_LENGTH),
            automation_queue_action_id: crypto.createHash('sha256').update(serverName+j+AUTOMATION_QUEUE_ACTION_ID_3).digest('hex').substring(0,ID_MAX_LENGTH),
          };
          monitorsList.push(monitor);
        }
      }
      return JSON.stringify(monitorsList, null, JSON_FORMAT_SPACE_COUNT);
    };

    fs.writeFile(
      path.join("output", "monitors.json"),
      monitorJson(),
      function (err) {
        if (err) {
          return console.error(err);
        }
        console.log("monitors.json created in the output folder");
      }
    );
  }
}
