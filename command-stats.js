var INFO = //{{{
<plugin name="command-stats" version="1.0"
        href="https://github.com/zklinger/vimperator-plugin/blob/master/command-stats.js"
        summary="Command Usage Statistics"
        xmlns="http://vimperator.org/namespaces/liberator">
    <author email="zoltan.klinger@gmail.com">Zoltan Klinger</author>
    <license href="http://opensource.org/licenses/mit-license.php">MIT</license>
    <project name="Vimperator" minVersion="3.0"/>
    <p>
        This plugin collects and displays command usage statistics.
    </p>
    <item>
      <tags>'stats'</tags>
      <spec>stats</spec>
      <description>
        <p> Display command usage statistics</p>
      </description>
    </item>
    <item>
      <tags>'delstats'</tags>
      <spec>delstats</spec>
      <description>
        <p> Delete all command usage statistics</p>
      </description>
    </item>
</plugin>;//}}}

var cmdStats = storage.newMap("command-stats", { store: true, privateData: true });
var cmdStatsDate = storage.newMap("command-stats-date", { store: true, privateData: true });
if (!cmdStatsDate.get("date"))
    cmdStatsDate.set("date", new Date().toString());

// Override liberator.execute function
liberator.execute = function (str, modifiers, silent) {//{{{
    // skip comments and blank lines
    if (/^\s*("|$)/.test(str))
        return;

    modifiers = modifiers || {};

    let err = null;
    let [count, cmd, special, args] = commands.parseCommand(str.replace(/^'(.*)'$/, "$1"));
    let command = commands.get(cmd);

    if (command === null) {
        err = "Not a " + config.name.toLowerCase() + " command: " + str;
        liberator.focusContent();
    }
    else if (command.action === null)
        err = "Internal error: command.action === null"; // TODO: need to perform this test? -- djk
    else if (count != null && !command.count)
        err = "No range allowed";
    else if (special && !command.bang)
        err = "No ! allowed";

    liberator.assert(!err, err);
    if (!silent)
        commandline.command = str.replace(/^\s*:\s*/, "");

    saveCmdUsage(command.name, args);

    command.execute(args, special, count, modifiers);
}//}}}

// Override mappings._getMap function
mappings._getMap = function (mode, cmd, patternOrUrl, stack) {//{{{
    let maps = stack[mode] || [];

    for (let [, map] in Iterator(maps)) {
        if (map.hasName(cmd) && this._matchingUrlsTest(map, patternOrUrl)) {
            if (map.action.toString().indexOf("commandline.open(") == -1)
                saveCmdUsage(map.names[0]);

            return map;
        }
    }

    return null;
}//}}}

// Save command usage count
function saveCmdUsage(cmd, args) {//{{{
    if (cmd == ":" || cmd == "<Space>")
        return;

    if (cmd == "set")
        cmd += " " + args;

    let count = cmdStats.get(cmd);
    if (count)
        cmdStats.set(cmd, count + 1);
    else
        cmdStats.set(cmd, 1);
}//}}}

// Display command usage statistics
function showCmdUsage() {//{{{
    let arr = new Array();
    let rows = new Array();
    let count = 0;
    let fromDate = cmdStatsDate.get("date");
    for (let [k, v] in cmdStats) {
        count += v;
        arr.push({key:k, value:v});
    }

    arr.sort(function(a, b) a.value < b.value);
    liberator.dump("====== Command Usage Statistics since " + fromDate + " =======");
    for ([, elem] in Iterator(arr)) {
        let percent = (100 * elem.value / count).toFixed(2) + " %";
        rows.push([elem.key, elem.value, percent]);
        liberator.dump(elem.key, elem.value, percent);
    }
    liberator.dump("======= End of Command Usage Statistics ========");

    let list = template.tabular( [
            { header: "Command",    style: "text-align: left" },
            { header: "Count",      style: "text-align: right" },
            { header: "Percentage     since " + fromDate, style: "text-align: center" }],
            rows);
    liberator.echo(list, commandline.HL_NORMAL, commandline.FORCE_MULTILINE);
}//}}}

// Clear out command usage data
function clearCmdUsage() {//{{{
    cmdStats.clear();
    cmdStatsDate.set("date", new Date().toString());
}//}}}

// Add user commands
commands.addUserCommand(["stats"], "Display command usage statistics", function (args) {//{{{
    showCmdUsage();
}, {
    literal: 0,
    completer: completion.javascript,
}, true);

commands.addUserCommand(["delstats"], "Delete command usage statistics", function (args) {
    clearCmdUsage();
}, {
    literal: 0,
    completer: completion.javascript,
}, true);//}}}

// vim: set fdm=marker sw=4 ts=4 et:
