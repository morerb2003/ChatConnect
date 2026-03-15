import pathlib, subprocess
patch = pathlib.Path('patch.diff').read_text(encoding='utf-8')
subprocess.run(['apply_patch', patch], check=True)
