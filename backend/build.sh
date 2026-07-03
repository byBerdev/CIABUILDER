#!/bin/bash

DIR=$1

cd $DIR

# 1. gerar banner (bannertool)
bannertool makebanner -i banner.png -o banner.bin

# 2. gerar icon
bannertool makeicon -i icon.png -o icon.icn

# 3. compilar homebrew (exemplo simples)
arm-none-eabi-gcc main.c -o main.elf -I$DEVKITPRO/libctru/include -lctru

# 4. empacotar CIA
makerom -f cia -o out.cia -target t -exefslogo -elf main.elf -icon icon.icn -banner banner.bin
