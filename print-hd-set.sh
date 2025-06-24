#!/bin/bash

folder1="public/org"
folder2="public/hd"

# Find common files, ignoring hidden files and directories
common_files=$(comm -12 <(find "$folder1" -type f -not -path '*/.*' | sed "s|^$folder1/||" | sort) <(find "$folder2" -type f -not -path '*/.*' | sed "s|^$folder2/||" | sort))

# Determine the common prefix
common_prefix=$(printf "%s\n" "$folder1" "$folder2" | sed 'N;s/^\(.*\).*\n\1.*$/\1/')

# Print in the desired format without the common prefix
for file in $common_files; do
    echo "'${file#$common_prefix/}',"
done
