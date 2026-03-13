package com.yunbd.edge.rules;

import com.yunbd.common.dto.AlertDto;
import com.yunbd.common.dto.TerminalStatusDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.kie.api.KieServices;
import org.kie.api.builder.KieBuilder;
import org.kie.api.builder.KieFileSystem;
import org.kie.api.builder.Message;
import org.kie.api.io.ResourceType;
import org.kie.api.runtime.KieContainer;
import org.kie.api.runtime.KieSession;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Component
public class DroolsEngine {
    private final KieContainer kieContainer;

    public DroolsEngine() {
        KieServices ks = KieServices.Factory.get();
        KieFileSystem kfs = ks.newKieFileSystem();
        kfs.write(ks.getResources()
                .newClassPathResource("rules/TerminalRules.drl")
                .setResourceType(ResourceType.DRL));
        KieBuilder builder = ks.newKieBuilder(kfs).buildAll();
        if (builder.getResults().hasMessages(Message.Level.ERROR)) {
            throw new RuntimeException("Drools compile error: " + builder.getResults().getMessages());
        }
        this.kieContainer = ks.newKieContainer(ks.getRepository().getDefaultReleaseId());
        log.info("Drools engine initialized");
    }

    public List<AlertDto> evaluate(TerminalStatusDto status) {
        List<AlertDto> alerts = new ArrayList<>();
        KieSession session = kieContainer.newKieSession();
        try {
            session.setGlobal("alerts", alerts);
            session.insert(status);
            session.fireAllRules();
        } finally {
            session.dispose();
        }
        return alerts;
    }
}
