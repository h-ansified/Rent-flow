@echo off
echo === GIT LOG === > git_verification.txt
git log -1 >> git_verification.txt
echo. >> git_verification.txt
echo === GIT STATUS === >> git_verification.txt
git status >> git_verification.txt
echo. >> git_verification.txt
echo === GIT REMOTE === >> git_verification.txt
git remote -v >> git_verification.txt
