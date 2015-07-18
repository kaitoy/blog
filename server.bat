@echo off

rmdir /S /Q public > nul
hugo server -w -D -b http://localhost
