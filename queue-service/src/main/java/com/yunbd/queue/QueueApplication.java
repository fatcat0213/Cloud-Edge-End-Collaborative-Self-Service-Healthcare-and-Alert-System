package com.yunbd.queue;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;

@SpringBootApplication(exclude = {DataSourceAutoConfiguration.class})
public class QueueApplication {
    public static void main(String[] args) {
        SpringApplication.run(QueueApplication.class, args);
    }
}
