# $1 - first parameter is a name of the archive.
# zip all files except of node_modules (modules binaries could depend on hardware)
zip $1 * -r --exclude=*node_modules*
mkdir bin
mv $1 bin/$1
echo -e "\n>ls -l:\n"
ls -l
echo -e "\n>ls bin/ -l:\n"
ls bin/ -l