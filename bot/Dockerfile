#checkov:skip=CKV_DOCKER_2:Healthcheck is handled by ECS
#checkov:skip=CKV_DOCKER_3:No user required for intermediate builder stage
# Stage 1: compile TypeScript to node-compatible JavaScript
FROM node:22 AS builder
WORKDIR /build

COPY package*.json .
RUN npm install

COPY tsconfig.json .
COPY types ./types
COPY src ./src

RUN npm run build

# Stage 2: Build the Wickr Bot container with our custom bot code
FROM public.ecr.aws/x3s2s6k3/wickrio/bot-cloud:6.36.13.01

ENV HOME /home/wickriouser
WORKDIR $HOME

# Install the AWS CLI
RUN apt-get install -y zip
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
RUN unzip awscliv2.zip
RUN ./aws/install

# Install Node 22
RUN . /usr/local/nvm/nvm.sh && nvm install 22

# Set up the integration code
COPY --from=builder /build/dist ./bedrock-bot
RUN tar -zcvf software.tar.gz -C ./bedrock-bot .
RUN mkdir /usr/lib/wickr/integrations/software/bedrock-bot
RUN cp software.tar.gz /usr/lib/wickr/integrations/software/bedrock-bot

COPY ./scripts/start-bot.sh .
RUN chmod +x start-bot.sh

ENTRYPOINT ["./start-bot.sh"]