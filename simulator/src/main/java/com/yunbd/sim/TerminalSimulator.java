package com.yunbd.sim;

import lombok.extern.slf4j.Slf4j;
import java.util.Collections;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.*;

@Slf4j
public class TerminalSimulator {
    private final int terminalCount;
    private final String brokerHost;
    private final int brokerPort;
    private final ScheduledExecutorService scheduler;
    // ConcurrentList: start() and the shutdown hook can race on shutdown.
    private final List<TerminalClient> clients = Collections.synchronizedList(new ArrayList<>());

    public TerminalSimulator(int terminalCount, String brokerHost, int brokerPort) {
        this.terminalCount = terminalCount;
        this.brokerHost = brokerHost;
        this.brokerPort = brokerPort;
        this.scheduler = Executors.newScheduledThreadPool(terminalCount);
    }

    public void start() throws Exception {
        for (int i = 1; i <= terminalCount; i++) {
            TerminalClient client = new TerminalClient(
                String.format("T%03d", i), brokerHost, brokerPort);
            client.connect();
            clients.add(client);
            final TerminalClient c = client;
            scheduler.scheduleAtFixedRate(
                () -> { try { c.publishStatus(); } catch (Exception e) { log.error("Publish error", e); }},
                i * 100L, 5000L, TimeUnit.MILLISECONDS);
        }
        log.info("Started {} terminal simulators", terminalCount);
    }

    public int getTerminalCount() { return terminalCount; }

    public void stop() throws Exception {
        scheduler.shutdown();
        scheduler.awaitTermination(5, TimeUnit.SECONDS);
        for (TerminalClient c : clients) c.disconnect();
    }

    public static void main(String[] args) throws Exception {
        String brokerHost = System.getenv().getOrDefault("MQTT_HOST", "localhost");
        int brokerPort = Integer.parseInt(System.getenv().getOrDefault("MQTT_PORT", "1883"));
        int count = Integer.parseInt(System.getenv().getOrDefault("TERMINAL_COUNT", "20"));
        TerminalSimulator sim = new TerminalSimulator(count, brokerHost, brokerPort);
        sim.start();
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            try { sim.stop(); } catch (Exception e) { log.error("Shutdown error", e); }
        }));
        Thread.currentThread().join();
    }
}
