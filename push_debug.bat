@echo off
echo STARTING PUSH DEBUG > push_log.txt
git remote -v >> push_log.txt 2>&1
echo PUSHING TO MAIN... >> push_log.txt
git push origin main >> push_log.txt 2>&1
echo. >> push_log.txt
echo PUSHING TO MASTER... >> push_log.txt
git push origin master >> push_log.txt 2>&1
echo DONE >> push_log.txt
