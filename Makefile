.PHONY: build-ApiFunction build-VendorApiFunction build-ReviewEmailsCronFunction build-SesEmailCronFunction build-BounceSyncFunction build-ImageOptimizeFunction build-CjImportWorkerFunction build-AgmarknetFetcherFunction build-FxFetcherFunction build-SpicePriceApiFunction api-deps

ESBUILD = npx esbuild --bundle --platform=node --target=es2022 --minify \
	--external:@aws-sdk/client-dynamodb \
	--external:@aws-sdk/lib-dynamodb \
	--external:@aws-sdk/client-s3 \
	--external:@aws-sdk/s3-request-presigner \
	--external:@aws-sdk/client-lambda

# SAM invokes build-<Function> once per Lambda. Do not npm ci on every target —
# GitHub Actions already installed deps; repeating that per function added ~10–15 minutes.
api-deps:
	mkdir -p .aws-sam
	@if [ -f .aws-sam/.api-deps-stamp ]; then \
		echo "api-deps: already completed this sam build"; \
	elif [ -d node_modules ] && [ -f packages/shared/dist/index.js ]; then \
		echo "api-deps: using existing node_modules + shared dist"; \
		touch .aws-sam/.api-deps-stamp; \
	else \
		npm ci && npm run build -w @spicycorner/shared && touch .aws-sam/.api-deps-stamp; \
	fi

build-ApiFunction: api-deps
	$(ESBUILD) apps/api/src/index.ts --outfile=$(ARTIFACTS_DIR)/index.js

build-VendorApiFunction: api-deps
	$(ESBUILD) apps/api/src/vendor-api.ts --outfile=$(ARTIFACTS_DIR)/vendor-api.js

build-ReviewEmailsCronFunction: api-deps
	$(ESBUILD) apps/api/src/scheduled.ts --outfile=$(ARTIFACTS_DIR)/scheduled.js

build-SesEmailCronFunction: api-deps
	$(ESBUILD) apps/api/src/ses-scheduled.ts --outfile=$(ARTIFACTS_DIR)/ses-scheduled.js

build-BounceSyncFunction: api-deps
	$(ESBUILD) apps/api/src/bounce-sync.ts --outfile=$(ARTIFACTS_DIR)/bounce-sync.js

build-CjImportWorkerFunction: api-deps
	$(ESBUILD) apps/api/src/cj-import-worker.ts --outfile=$(ARTIFACTS_DIR)/cj-import-worker.js

build-AgmarknetFetcherFunction: api-deps
	$(ESBUILD) apps/api/src/agmarknet-fetcher.ts --outfile=$(ARTIFACTS_DIR)/agmarknet-fetcher.js

build-FxFetcherFunction: api-deps
	$(ESBUILD) apps/api/src/fx-fetcher.ts --outfile=$(ARTIFACTS_DIR)/fx-fetcher.js

build-SpicePriceApiFunction: api-deps
	$(ESBUILD) apps/api/src/spice-price-api.ts --outfile=$(ARTIFACTS_DIR)/spice-price-api.js

# Separate artifact: sharp native binary for linux/arm64 (Lambda architecture).
# Do not bundle sharp into the API function — it would bloat every request path.
build-ImageOptimizeFunction: api-deps
	mkdir -p $(ARTIFACTS_DIR)
	npx esbuild apps/api/src/image-optimize.ts \
		--bundle \
		--platform=node \
		--target=es2022 \
		--minify \
		--outfile=$(ARTIFACTS_DIR)/index.js \
		--external:sharp \
		--external:@aws-sdk/client-s3
	printf '%s\n' '{"name":"image-optimize","private":true,"dependencies":{"sharp":"0.33.5"}}' > $(ARTIFACTS_DIR)/package.json
	npm install --omit=dev --prefix $(ARTIFACTS_DIR) --cpu=arm64 --os=linux --libc=glibc
