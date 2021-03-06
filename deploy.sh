# deploy.sh
#! /bin/bash

aws configure set default.region us-west-1
aws configure set default.output json

CIRCLE_BUILD_NUM=$1

# Deploy image to Docker Hub
#docker push oink/oink-financial:$CIRCLE_BUILD_NUM

# Create new Elastic Beanstalk version
EB_BUCKET=elasticbeanstalk-us-west-1-591231839583
#DOCKERRUN_FILE=$SHA1-Dockerrun.aws.json
DOCKERRUN_FILE=Dockerrun.aws.json
# sed "s/<TAG>/$SHA1/" < Dockerrun.aws.json.template > $DOCKERRUN_FILE
aws s3 cp $DOCKERRUN_FILE s3://$EB_BUCKET/$DOCKERRUN_FILE
aws elasticbeanstalk create-application-version --application-name oink-financial \
  --version-label $CIRCLE_BUILD_NUM --source-bundle S3Bucket=$EB_BUCKET,S3Key=$DOCKERRUN_FILE

# Update Elastic Beanstalk environment to new version
aws elasticbeanstalk update-environment --environment-name oinkfinancial-env \
    --version-label $CIRCLE_BUILD_NUM
