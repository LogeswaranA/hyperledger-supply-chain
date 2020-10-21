Keep the environment clean 
--------------------------
docker swarm leave -f

docker rm -f $(docker ps -a -q)

docker rmi -f $(docker images -a -q)

docker ps

docker volume

docker volume prune

docker images

 
test

Steps to start the network in both the network
---------
Terminal 1
-------------
docker swarm init

docker swarm join-token manager


Terminal 2
- Output of above command to be initiated in other terminal


Terminal 1
----------
./createNetwork.sh

cd org1

./deploy.sh


Terminal 2
----------

cd org2

./deploy.sh

 
Terminal 1
----------
cd supply-chain-api/

npm install

npm start

Access your api's via swaagger, login using localhost:5000/api-docs 

1) create user 
2) Login
3) Authorize & play with rest of the api'
4) Update chaincode and add your own api's in bcNetwork.js


--
