# protonmail-desktop-app

is an unofficial [ProtonMail](https://protonmail.com/) desktop client. It's basically the ProtonMail's [web interface](https://mail.protonmail.com) that's being opened inside [Electron](https://github.com/electron/electron) container with custom features built on top of it. You can see below the screenshots of the `default` and `compact` view modes.

![view-default](https://user-images.githubusercontent.com/1560781/34328616-a10c2a2a-e8f4-11e7-9cfe-2308ee3391b2.png)

![view-compact](https://user-images.githubusercontent.com/1560781/34328615-a0efd0be-e8f4-11e7-8c1e-09af27073127.png)

## Features
- Cross platform, Linux/OSX/Windows packages [provided](https://github.com/vladimiry/protonmail-desktop-app/releases).
- Multi accounts support.
- Automatic login into the app with remembered master password ("Keep me signed in" feature).
- Auto login into the accounts using either saved in the settings password or KeePass password manager.
- Encrypted settings storage with switchable predefined key derivation and encryption presets. Argon2 is used as the default key derivation function.
- Native notifications for individual accounts clicking on which focuses the app window and selects respective account in the accounts list.
- System tray icon with a total number of unread messages shown on top of it.
- Start minimized to tray.
- Close to tray.
- Compact view mode.

## Build your own binary

- Regardless of the platform you are working on, you will need to have Node.JS v8 installed. Version 8 is required to match the Node.JS version Electron comes with. If you already have Node.JS installed, but not the version 8, then you might want you to use [Node Version Manager](https://github.com/creationix/nvm) to be able to work with multiple versions:
  - Install [NVM](https://github.com/creationix/nvm).
  - Run `nvm instal 8`.
  - Run `nvm use 8`.
- [keytar](https://github.com/atom/node-keytar) module requires compiling prebuild node files and for that Python and C++ compiler need to be installed on your system:
  - **`On Windows`**: the simplest way to install all the needed stuff on Windows is to run `npm install --global --production windows-build-tools` CLI command.
  - **`On Linux`**: `python v2.7`, `make` and a C/C++ compiler toolchain, like `GCC` are most likely already installed.
  - **`On Mac OS X`**: `python v2.7` and [Xcode](https://developer.apple.com/xcode/download/) need to be installed. You also need to install the `Command Line Tools` via Xcode, can be found under the `Xcode -> Preferences -> Downloads` menu.
- [Clone](https://help.github.com/articles/cloning-a-repository/) this project to your local device. If you are going to contribute, consider cloning the [forked](https://help.github.com/articles/fork-a-repo/) into your own GitHub account project.
- Install dependencies running `npm install`.
- Build app running `npm run app:dist`. It's better to not touch a mouse during the process, since it might interfere with the `e2e` tests running at the end of the process.
- Build the final Electron binary running `electron-builder:dist`. Outcome will be placed under the `./dist` folder.
