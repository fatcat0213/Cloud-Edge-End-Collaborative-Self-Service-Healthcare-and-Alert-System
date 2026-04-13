package com.yunbd.edge.command;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/v1/commands")
public class CommandController {
    private final CommandService commandService;

    public CommandController(CommandService commandService) {
        this.commandService = commandService;
    }

    @PostMapping(value = "/dispatch", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> dispatchCommand(
            @RequestParam String terminalId,
            @RequestParam CommandDto.CommandType type,
            @RequestBody(required = false) Map<String, Object> body) {

        String payload = body != null ? String.valueOf(body.get("payload")) : null;
        CommandDto command = commandService.dispatchCommand(terminalId, type, payload);

        if (command.getStatus() == CommandDto.CommandStatus.FAILED) {
            return Map.of("success", false, "error", command.getResult());
        }

        return Map.of("success", true, "data", command);
    }

    @GetMapping(value = "/{commandId}", produces = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> getCommand(@PathVariable String commandId) {
        CommandDto command = commandService.getCommandStatus(commandId);
        if (command == null) {
            return Map.of("success", false, "error", "Command not found");
        }
        return Map.of("success", true, "data", command);
    }

    @GetMapping(value = "/recent", produces = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> getRecentCommands(@RequestParam(defaultValue = "20") int limit) {
        List<CommandDto> commands = commandService.getRecentCommands(limit);
        return Map.of("success", true, "data", commands);
    }

    @GetMapping(value = "/terminal/{terminalId}", produces = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> getTerminalCommands(@PathVariable String terminalId) {
        List<CommandDto> commands = commandService.getCommandsByTerminal(terminalId);
        return Map.of("success", true, "data", commands);
    }
}
