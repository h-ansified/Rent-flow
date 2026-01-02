@echo off
echo === BRANCH INFO === > git_state.txt
git branch -vv >> git_state.txt
echo. >> git_state.txt
echo === LOG === >> git_state.txt
git log -n 3 --oneline >> git_state.txt
echo. >> git_state.txt
echo === STATUS === >> git_state.txt
git status >> git_state.txt
