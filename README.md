# ElectronMail

is an [Electron](https://electronjs.org)-based unofficial desktop client for [ProtonMail](https://protonmail.com/) and [Tutanota](https://tutanota.com/) end-to-end encrypted email providers. The app aims to provide enhanced desktop user experience enabling features that are not supported by the official in-browser web clients. 
It is written in [TypeScript](http://www.typescriptlang.org) and uses [Angular](https://angular.io).

[![Build Status: Linux / MacOS](https://travis-ci.org/vladimiry/ElectronMail.svg?branch=master)](https://travis-ci.org/vladimiry/ElectronMail) [![Build status: Windows](https://ci.appveyor.com/api/projects/status/vex909uhwadrse27?svg=true)](https://ci.appveyor.com/project/vladimiry/ElectronMail)

![view-toggling](images/search.gif)

## Download

The download page with Linux/OSX/Windows installation packages is [here](https://github.com/vladimiry/ElectronMail/releases).

`Pacman` and `Snap` packages are also available for installing from the following repositories (both repositories are being maintained by [@joshirio](https://github.com/joshirio)):

[![Get it from the AUR](images/aurlogo.png)](https://aur.archlinux.org/packages/electronmail-bin)

[![Get it from the Snap Store](https://snapcraft.io/static/images/badges/en/snap-store-black.svg)](https://snapcraft.io/electron-mail)

## Features

- **Cross platform**. The app works on Linux/OSX/Windows platforms.
- **Multi email providers** support. [ProtonMail](https://protonmail.com/) and [Tutanota](https://tutanota.com/) at the moment.
- **Multi accounts** support per each email provider including supporting individual [entry point domains](https://github.com/vladimiry/ElectronMail/issues/29).
- **Automatic login into the app** with a remembered master password using [keytar](https://github.com/atom/node-keytar) module ([keep me signed in](images/keep-me-signed-in.png) feature).
- **Automatic login into the email accounts**, including filling [2FA tokens](https://github.com/vladimiry/ElectronMail/issues/10). Two auto-login delay scenarios supported in order to make it harder to correlate the identities, see the respective [issue](https://github.com/vladimiry/ElectronMail/issues/121).
- **Encrypted settings storage** with switchable predefined key derivation and encryption presets. Argon2 is used as the default key derivation function.
- **Native notifications** for individual accounts clicking on which focuses the app window and selects respective account in the accounts list.
- **System tray icon** with a total number of unread messages shown on top of it. Enabling [local messages store](https://github.com/vladimiry/ElectronMail/issues/32) improves this feature ([how to enable](https://github.com/vladimiry/ElectronMail/releases/tag/v2.0.0-beta.1)), see respective [issue](https://github.com/vladimiry/ElectronMail/issues/30).
- **Switchable view layouts** (full, tabs and dropdown). See details [here](https://github.com/vladimiry/ElectronMail/issues/36) and screenshots in the [images](images) folder.
- **Offline access to the emails**. The [local store](https://user-images.githubusercontent.com/1560781/51189497-382a6c00-18f1-11e9-9b9a-baa63f0c0ff4.gif) feature enables storing your messages in the encrypted `database.bin` file, so you could view your messages offline, perform a full-text search against them and export them to EML files. Enabled since [v2.0.0](https://github.com/vladimiry/ElectronMail/releases/tag/v2.0.0) release.
- **Batch emails export** to EML files. Feature released with [v2.0.0-beta.4](https://github.com/vladimiry/ElectronMail/releases/tag/v2.0.0-beta.4) version, requires `local messages store` feature to be enabled ([how to enable](https://github.com/vladimiry/ElectronMail/releases/tag/v2.0.0-beta.1)).
- **Full-text search**. Enabled with [v2.2.0](https://github.com/vladimiry/ElectronMail/releases/tag/v2.2.0) release. See the respective [issue](https://github.com/vladimiry/ElectronMail/issues/92) for details.
- **Built-in/prepackaged web clients**. The built-in web clients are built from source code, see respective official [Protonmail](https://github.com/ProtonMail/WebClient) and [Tutanota](https://github.com/tutao/tutanota) repositories. See [79](https://github.com/vladimiry/ElectronMail/issues/79) and [80](https://github.com/vladimiry/ElectronMail/issues/80) issues for details.
- **Configuring proxy per account** support. Enabled since [v3.0.0](https://github.com/vladimiry/ElectronMail/releases/tag/v3.0.0) release. See [113](https://github.com/vladimiry/ElectronMail/issues/113) and [120](https://github.com/vladimiry/ElectronMail/issues/120) issues for details.
- **Starting minimized to tray**.
- **Closing to tray**.

## How to build package from source code

- Regardless of the platform you are working on, you will need to have Node.js v10 installed. v10 as it's recommended to go with the same Node.js version Electron comes with. If you already have Node.js installed, but not the version 10, then you might want to use [Node Version Manager](https://github.com/creationix/nvm) to be able to switch between multiple Node.js versions:
  - Install [NVM](https://github.com/creationix/nvm).
  - Run `nvm install 10`.
  - Run `nvm use 10`.
- Some native modules require node prebuilds files compiling and for that Python and C++ compiler need to be installed on your system:
  - On `Windows`: the simplest way to install all the needed stuff on Windows is to run `npm install --global --production windows-build-tools` CLI command. [Tutanota](https://github.com/tutao/tutanota) and [ProtonMail](https://github.com/ProtonMail/WebClient) web clients projects require bash for building, so a few more steps need to be fulfilled:
    - Install bash then check the path of bash ex: `C:\\Program Files\\git\\bin\\bash.exe`.
    - Execute `npm config set script-shell "C:\\Program Files\\git\\bin\\bash.exe"` command.
  - On `Linux`: `python v2.7`, `make` and a C/C++ compiler toolchain, like `GCC` are most likely already installed. Besides [keytar](https://github.com/atom/node-keytar) needs `libsecret` library to be installed.
  - On `Mac OS X`: `python v2.7` and [Xcode](https://developer.apple.com/xcode/download/) need to be installed. You also need to install the `Command Line Tools` via Xcode, can be found under the `Xcode -> Preferences -> Downloads` menu.
- [Clone](https://help.github.com/articles/cloning-a-repository/) this project to your local device. If you are going to contribute, consider cloning the [forked](https://help.github.com/articles/fork-a-repo/) into your own GitHub account project.
- Install [Yarn](https://yarnpkg.com/en/docs/install).
- Install dependencies running `yarn --pure-lockfile`.
- Build app running `yarn run app:dist`. It's better to not touch a mouse during the process, since it might interfere with the `e2e` tests running at the end of the process.
- Build a package to install running `yarn run electron-builder:dist` command to build Windows/Mac OS X package and one of the following commands to build Linux package:
  - `yarn run electron-builder:dist:linux:appimage`
  - `yarn run electron-builder:dist:linux:deb`
  - `yarn run electron-builder:dist:linux:freebsd`
  - `yarn run electron-builder:dist:linux:pacman`
  - `yarn run electron-builder:dist:linux:rpm`
  - `yarn run electron-builder:dist:linux:snap`
- If you don't need a package to install, but a folder to execute app from, simply run `yarn run electron-builder:dir` command.  
- Binary executable, whether it's a folder or package to install, comes into the `./dist` folder.

To recap, considering that all the described build requirements are met, the short command to build let's say Arch Linux package will be `yarn --pure-lockfile && yarn app:dist && yarn electron-builder:dist:linux:pacman`.

## Data/config files created and used by the app

If you want to backup the app data these are only files you need to take care of (files localed in the [settings folder](images/open-settings-folder.jpg)):
- `config.json` file keeps config parameters. There is no sensitive data in this file, so unencrypted.
- `settings.bin` file keeps added to the app accounts including credentials if a user decided to save them. The file is encrypted with 32 bytes length key derived from the master password.
- `database.bin ` file is a local database that keeps fetched emails/folders/contacts entities if the `local store` feature was enabled for at least one account. The file is encrypted with 32 bytes length key randomly generated and stored in `settings.bin`. The app by design flushes and loads to memory the `database.bin` file as a whole thing but not like encrypting only the specific columns of the database. It's of course not an optimal approach in terms of performance and resource consumption but it allows keeping the metadata hidden. You can see some details [here](https://github.com/vladimiry/ElectronMail/issues/32).
- `log.log` file keeps log lines. The log level by default is set to `error` (see `config.json` file).

## Removing the app

It's recommended to perform the following actions before uninstalling the app:
- If you had the `Keep me signed in` feature enabled (see [screenshot](images/keep-me-signed-in.png)), click `Log-out` action in the app menu (see [screenshot](images/logout.png)). That will remove locally stored master password (done with [node-keytar](https://github.com/atom/node-keytar)). You can also remove it having the app already uninstalled, but that would be a more complicated way as you will have to manually edit the system's keychain.
- Remove settings folder manually. You can locate settings folder path clicking `Open setting folder` app/tray menu item (see [screenshot](images/open-settings-folder.jpg)) or reading `app.getPath(name ="userData")` related `app.getPath(name)` section [here](https://electronjs.org/docs/api/app#appgetpathname). 
