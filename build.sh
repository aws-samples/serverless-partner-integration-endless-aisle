npm install -g aws-cdk
cd infrastructure && npm install 
cd lib/lambda  && npm install
cd ../../ && npm run build
cdk synth InfrastructureStack