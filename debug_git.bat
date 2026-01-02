@echo off
echo REMOTE: > debug_git.txt
git remote -v >> debug_git.txt
echo. >> debug_git.txt
echo BRANCH: >> debug_git.txt
git branch >> debug_git.txt
echo. >> debug_git.txt
echo STATUS: >> debug_git.txt
git status >> debug_git.txt
echo. >> debug_git.txt
echo LAST COMMIT: >> debug_git.txt
git log -1 >> debug_git.txt
