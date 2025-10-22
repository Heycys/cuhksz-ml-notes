import os
from bs4 import BeautifulSoup

def clean_duplicate_captions_in_file(file_path):
    """
    针对wolai导出的bug进行修复
    处理单个HTML文件，查找并清理figcaption中重复的文本。

    Args:
        file_path (str): HTML文件的路径。
    """
    try:
        # 使用 utf-8 编码读取文件，这是网页最常用的编码
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # 使用BeautifulSoup解析HTML
        soup = BeautifulSoup(content, 'html.parser')
        
        # 查找所有的figcaption标签
        captions = soup.find_all('figcaption')
        
        if not captions:
            # 如果没有figcaption标签，则直接返回
            return

        is_modified = False
        for caption in captions:
            # 获取标签内的原始文本内容，保留内部的空格
            # .string 对于简单的文本标签更可靠
            if caption.string:
                text = caption.string.strip()
                length = len(text)
                
                # 检查文本是否符合 "A A" 的模式
                # 长度必须是奇数（因为中间有个空格），并且中间点必须是空格
                # 且前后两部分必须完全相等
                if length > 1 and length % 2 == 1:
                    mid_index = length // 2
                    if text[mid_index] == ' ':
                        part1 = text[:mid_index]
                        part2 = text[mid_index+1:]
                        
                        if part1 == part2:
                            # 如果前后两部分相同，则说明是重复文本
                            print(f"    - 找到了重复注解: '{text}'")
                            # 将标签内容修改为不重复的部分
                            caption.string = part1
                            is_modified = True
                            print(f"    - 已修正为: '{part1}'")

        # 如果文件内容发生了修改，则写回文件
        if is_modified:
            with open(file_path, 'w', encoding='utf-8') as f:
                # 使用str(soup)而不是prettify()来最小化对原文件格式的改动
                f.write(str(soup))
            print(f"-> 文件 '{file_path}' 已成功更新。")

    except Exception as e:
        print(f"处理文件 '{file_path}' 时发生错误: {e}")


def process_html_files_in_folder(root_folder):
    """
    遍历指定文件夹及其子文件夹下的所有HTML文件，并进行处理。

    Args:
        root_folder (str): 要处理的根文件夹路径。
    """
    if not os.path.isdir(root_folder):
        print(f"错误：提供的路径 '{root_folder}' 不是一个有效的文件夹。")
        return
        
    print(f"开始扫描文件夹: '{root_folder}'...")
    
    # os.walk会遍历文件夹、子文件夹和文件
    for dirpath, _, filenames in os.walk(root_folder):
        for filename in filenames:
            # 检查文件是否为html或htm文件
            if filename.lower().endswith(('.html', '.htm')):
                file_path = os.path.join(dirpath, filename)
                print(f"\n正在处理文件: {file_path}")
                clean_duplicate_captions_in_file(file_path)
                
    print("\n所有HTML文件处理完毕。")


if __name__ == "__main__":
    # --- 请在这里填入您要处理的文件夹的相对路径或绝对路径 ---
    # 例如: target_folder = "my_notes"
    # 或者: target_folder = "C:/Users/YourUser/Documents/Notes"
    target_folder = "pages" 
    
    # 运行主程序
    process_html_files_in_folder(target_folder)