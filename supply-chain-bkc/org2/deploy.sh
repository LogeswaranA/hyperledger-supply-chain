docker stack deploy -c ca.yaml ca_org2

docker stack deploy -c couch.yaml couchpeer0org2

docker stack deploy -c couch1.yaml couchpeer1org2

docker stack deploy -c peer0.yaml peer0_org2

docker stack deploy -c peer1.yaml peer1_org2

