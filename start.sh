#!/bin/bash
set -e

# Navigate to the backend directory
cd chatconnecting

# Build with Maven
echo "Building Spring Boot application..."
./mvnw clean package -DskipTests

# Run the application
echo "Starting application..."
java -Dserver.port=${PORT:-8080} -jar target/*.jar
