#aws cloudformation package --template-file template.yml --s3-bucket wallets-lambda --s3-prefix polo-wallet-monitor --output-template-file packaged-sam.yml &&
#aws cloudformation deploy --template-file packaged-sam.yml --stack-name polo-wallet-monitor-test --capabilities CAPABILITY_IAM &&

aws cloudformation update-stack --stack-name polo-wallets-monitor --template-body file://pipeline.yml --s3-bucket wallets-lambda --s3-prefix polo-wallet-monitor --output-template-file packaged-sam.yml &&
aws cloudformation deploy --template-file packaged-sam.yml --stack-name polo-wallets-monitor --capabilities CAPABILITY_IAM
