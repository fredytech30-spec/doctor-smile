@echo off
cd /d %~dp0
REM commit .gitignore update
echo ignore temporary Office files > .gitmessage
git add .gitignore









git push origin maingit commit -m "chore: remove tracked Office temp files (~$*)" || echo no removal to commit)  git rm --cached "%%f"  echo removing tracked %%ffor /f "delims=" %%f in ('git ls-files "*~$*"') do (REM remove tracked files starting with ~$del .gitmessagengit commit -F .gitmessage || echo no changes to commit