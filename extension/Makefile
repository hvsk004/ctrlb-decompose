DIST_DIR := dist
PACKAGE_DIR := $(DIST_DIR)/chrome-webstore-package
EXTENSION_VERSION := $(shell node -p "require('./manifest.json').version")
ZIP_FILE := $(DIST_DIR)/ctrlb-decompose-chrome-webstore-v$(EXTENSION_VERSION).zip

.PHONY: manifest-check extension-wasm package-chrome-webstore-dir chrome-webstore-zip clean-chrome-webstore-zip

manifest-check:
	@node -e "JSON.parse(require('fs').readFileSync('manifest.json', 'utf8')); console.log('manifest ok')"

extension-wasm:
	@rm -rf pkg
	wasm-pack build .. --target web --out-dir extension/pkg --no-pack --no-typescript -- --no-default-features --features wasm

package-chrome-webstore-dir: manifest-check extension-wasm
	@rm -rf "$(PACKAGE_DIR)"
	@mkdir -p "$(PACKAGE_DIR)/background" "$(PACKAGE_DIR)/panel" "$(PACKAGE_DIR)/icons" "$(PACKAGE_DIR)/pkg"
	@cp "manifest.json" "$(PACKAGE_DIR)/manifest.json"
	@cp -R "background/." "$(PACKAGE_DIR)/background/"
	@cp -R "panel/." "$(PACKAGE_DIR)/panel/"
	@cp "icons/icon16.png" "$(PACKAGE_DIR)/icons/icon16.png"
	@cp "icons/icon48.png" "$(PACKAGE_DIR)/icons/icon48.png"
	@cp "icons/icon128.png" "$(PACKAGE_DIR)/icons/icon128.png"
	@cp "pkg/ctrlb_decompose.js" "$(PACKAGE_DIR)/pkg/ctrlb_decompose.js"
	@cp "pkg/ctrlb_decompose_bg.wasm" "$(PACKAGE_DIR)/pkg/ctrlb_decompose_bg.wasm"
	@printf 'Prepared %s\n' "$(PACKAGE_DIR)"

chrome-webstore-zip: package-chrome-webstore-dir
	@rm -f "$(ZIP_FILE)"
	@cd "$(PACKAGE_DIR)" && zip -rq "../$(notdir $(ZIP_FILE))" .
	@printf 'Created %s\n' "$(ZIP_FILE)"

clean-chrome-webstore-zip:
	rm -rf "$(PACKAGE_DIR)" "$(ZIP_FILE)"
