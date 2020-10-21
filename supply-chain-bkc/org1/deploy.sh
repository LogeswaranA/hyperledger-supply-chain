docker stack deploy -c orderer.yaml orderer_org1

docker stack deploy -c ca.yaml ca_org1

docker stack deploy -c couch.yaml couchpeer0org1

docker stack deploy -c couch1.yaml couchpeer1org1

docker stack deploy -c peer0.yaml peer0_org1

docker stack deploy -c peer1.yaml peer1_org1

