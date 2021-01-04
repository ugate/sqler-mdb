#!/bin/bash
# Wait for two docker healthchecks to be in a "healthy" state before executing a "docker exec -it $2 bash $3"
##############################################################################################################################
# $1 Docker container name that will wait for a "healthy" healthcheck (required)
# $2 Docker container name that will wait for a "healthy" healthcheck and will be used to run the execution command (required)
# $3 The actual execution command that will be ran ran (required)
attempt=0
health1=checking
health2=checking
while [ $attempt -le 79 ]; do
  attempt=$(( $attempt + 1 ))
  echo "Waiting for docker healthcheck on services $1 ($health1) and $2 ($health2): attempt: $attempt..."
  if [[ health1 != "healthy" ]]; then
    health1=$(docker inspect -f {{.State.Health.Status}} $1)
  fi
  if [[ $health2 != "healthy" ]]; then
    health2=$(docker inspect -f {{.State.Health.Status}} $2)
  fi
  if [[ $health1 == "healthy" && $health2 == "healthy"  ]]; then
    echo "Docker healthcheck on services $1 ($health1) and $2 ($health2) - executing: $3"
    if [[ $3 == 'npm_deploy' ]]; then
      [[ -z "$GITHUB_TOKEN" ]] && { echo "Missing GITHUB_TOKEN. Failed to \"$3\" in docker container \"$2\"" >&2; exit 1; }
      [[ -z "$NPM_TOKEN" ]] && { echo "Missing NPM_TOKEN. Failed to \"$3\" in docker container \"$2\"" >&2; exit 1; }

cat <<EOF > .env
GITHUB_TOKEN="$GITHUB_TOKEN"
NPM_TOKEN="$NPM_TOKEN"
EOF
      CMD="npm run jsdocp-deploy"
      docker exec -it $2 bash -c 'echo "//registry.npmjs.org/:_authToken=\\\${NPM_TOKEN}" > .npmrc'
      docker exec -it $2 bash -c $CMD
      [[ $? != 0 ]] && { echo "Failed to \"$3\" at \"$CMD\" in docker container \"$2\"" >&2; rm .env; exit 1; }
      rm .env
    else
      docker exec -it $2 bash -c "$3"
      [[ $? != 0 ]] && { echo "Failed to execute \"$3\" in docker container \"$2\"" >&2; exit 1; }
    fi
    break
  fi
  sleep 2
done
if [[ $health1 != "healthy" || $health2 != "healthy"  ]]; then
  echo "Failed to wait for docker healthcheck on services $1 ($health1) and $2 ($health2) after $attempt attempts"
  docker logs --details $1
  docker logs --details $2
  exit 1
fi
# while [ "`docker inspect -f {{.State.Health.Status}} $1`" != "healthy" ]; do sleep 2; done
# while [ "`docker inspect -f {{.State.Health.Status}} $2`" != "healthy" ]; do sleep 2; done