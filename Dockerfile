# This Dockerfile helps Railway find and build the Spring Boot backend
# Located in: chatconnecting/ subdirectory

FROM maven:3.9-eclipse-temurin-17 as builder
WORKDIR /app
COPY chatconnecting/pom.xml .
COPY chatconnecting/.mvn .mvn
COPY chatconnecting/mvnw .
RUN chmod +x ./mvnw && ./mvnw dependency:go-offline
COPY chatconnecting/src src
RUN ./mvnw clean package -DskipTests

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar
ENV PORT=8080
EXPOSE ${PORT}
ENTRYPOINT ["java", "-Dserver.port=${PORT}", "-jar", "app.jar"]
