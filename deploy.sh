aws cloudformation package --template-file template.yaml --s3-bucket wallets-lambda --output-template-file output.yaml && 
aws cloudformation deploy --stack-name polo-wallet-monitor --template-file output.yaml
