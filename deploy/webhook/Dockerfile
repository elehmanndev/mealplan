# syntax=docker/dockerfile:1.7
#
# Extends almir/webhook (alpine + the upstream `webhook` binary) with the tools
# deploy.sh needs: git for fetch/reset, docker-cli + compose plugin for the
# rebuild, curl for the health probe, bash for set -euo pipefail.

FROM almir/webhook:latest

USER root
RUN apk add --no-cache \
        git \
        docker-cli \
        docker-cli-compose \
        curl \
        bash

EXPOSE 9000
