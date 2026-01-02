@echo off
echo ========================================
echo RentFlow Expenses Page Fix Script
echo ========================================
echo.

echo Step 1: Checking PowerShell execution policy...
powershell -Command "Get-ExecutionPolicy -Scope CurrentUser"
echo.

echo Step 2: Setting execution policy (if needed)...
powershell -Command "Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force"
echo Execution policy updated.
echo.

echo Step 3: Running database migration...
echo This will create the expenses table in your database.
call npm run db:push
echo.

echo Step 4: Verifying build...
call npm run check
echo.

echo ========================================
echo Fix Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Start the dev server: npm run dev
echo 2. Navigate to http://localhost:5000/expenses
echo 3. The expenses page should now load correctly
echo.
pause
