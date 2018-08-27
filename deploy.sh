aws cloudformation package --template-file template.yml --s3-bucket wallets-lambda --output-template-file output.yml && 
aws cloudformation deploy --stack-name polo-wallet-monitor --template-file output.yml
