#!/bin/bash

set -eu

AWS_PROFILE=${AWS_PROFILE:-default}
LAMBDA_DEPLOY_BUCKET=${LAMBDA_DEPLOY_BUCKET:-'circle-lambda-deploy-032274069722-us-east-1'}

case $1 in
	create-stack)
		echo "Creating Stack"
		;;
  update-stack)
    echo "Updating Stack"
    ;;
  *)
		echo "Please either create-stack or update-stack"
    exit 1
    ;;
esac

aws cloudformation $1 \
	--stack-name polo-wallets-monitor \
	--template-body file://pipeline.yml \
	--capabilities CAPABILITY_IAM \
	--parameters ParameterKey=GithubOAuthToken,ParameterValue=$GITHUB_OAUTH_TOKEN
