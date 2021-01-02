#!/bin/bash
# Wait for two docker healthchecks to be in a "healthy" state before executing a "docker exec -it $2 bash $3"
##############################################################################################################################
# $1 Docker container name that will wait for a "healthy" healthcheck (required)
# $2 Docker container name that will wait for a "healthy" healthcheck and will be used to run the execution command (required)
# $3 The actual execution command that will be ran ran (required)
attempt=0
health1=checking
health2=checking
while [ $attempt -le 59 ]; do
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
    docker exec -it $2 bash -c "$3"
    [[ $? != 0 ]] && { echo "Failed to execute \"$3\" in docker container \"$2\"" >&2; exit 1; }
    break
  fi
  sleep 2
done
# while [ "`docker inspect -f {{.State.Health.Status}} $1`" != "healthy" ]; do sleep 2; done
# while [ "`docker inspect -f {{.State.Health.Status}} $2`" != "healthy" ]; do sleep 2; done
