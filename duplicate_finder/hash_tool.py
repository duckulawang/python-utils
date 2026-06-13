import hashlib
import os
import tkinter as tk
from tkinter import filedialog, messagebox, ttk
import threading

class HashTool:
    def __init__(self, root):
        self.root = root
        self.root.title("文件哈希值工具（含比较）")
        self.root.geometry("650x550")
        self.root.resizable(True, True)

        # 文件路径
        self.file_path = tk.StringVar()
        # 比较功能变量
        self.file1_path = tk.StringVar()
        self.file2_path = tk.StringVar()
        self.compare_result = tk.StringVar()

        self.create_widgets()

    def create_widgets(self):
        # ---------- 单文件哈希计算区域 ----------
        hash_frame = ttk.LabelFrame(self.root, text="计算单个文件哈希")
        hash_frame.pack(pady=5, padx=10, fill=tk.X)

        top_frame = ttk.Frame(hash_frame)
        top_frame.pack(pady=5, padx=5, fill=tk.X)

        ttk.Label(top_frame, text="文件：").pack(side=tk.LEFT)
        self.path_entry = ttk.Entry(top_frame, textvariable=self.file_path, state='readonly')
        self.path_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=5)
        ttk.Button(top_frame, text="选择文件", command=self.select_file).pack(side=tk.LEFT)
        ttk.Button(top_frame, text="开始计算", command=self.start_calc).pack(side=tk.LEFT, padx=5)

        # 进度条（改为确定模式，初始值为0）
        self.progress = ttk.Progressbar(hash_frame, mode='determinate', maximum=100, value=0)
        self.progress.pack(fill=tk.X, padx=10, pady=5)

        # 结果显示
        self.result_text = tk.Text(hash_frame, height=8, state=tk.DISABLED, font=('Consolas', 10))
        self.result_text.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)

        btn_frame = ttk.Frame(hash_frame)
        btn_frame.pack(pady=5)
        ttk.Button(btn_frame, text="复制全部", command=self.copy_all).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="清空", command=self.clear_result).pack(side=tk.LEFT, padx=5)

        # ---------- 文件比较区域 ----------
        compare_frame = ttk.LabelFrame(self.root, text="比较两个文件")
        compare_frame.pack(pady=10, padx=10, fill=tk.X)

        # 文件1
        f1_frame = ttk.Frame(compare_frame)
        f1_frame.pack(fill=tk.X, padx=5, pady=5)
        ttk.Label(f1_frame, text="文件1：").pack(side=tk.LEFT)
        ttk.Entry(f1_frame, textvariable=self.file1_path, state='readonly').pack(side=tk.LEFT, fill=tk.X, expand=True, padx=5)
        ttk.Button(f1_frame, text="选择", command=lambda: self.select_compare_file(1)).pack(side=tk.LEFT)

        # 文件2
        f2_frame = ttk.Frame(compare_frame)
        f2_frame.pack(fill=tk.X, padx=5, pady=5)
        ttk.Label(f2_frame, text="文件2：").pack(side=tk.LEFT)
        ttk.Entry(f2_frame, textvariable=self.file2_path, state='readonly').pack(side=tk.LEFT, fill=tk.X, expand=True, padx=5)
        ttk.Button(f2_frame, text="选择", command=lambda: self.select_compare_file(2)).pack(side=tk.LEFT)

        # 比较按钮和结果显示
        btn_result_frame = ttk.Frame(compare_frame)
        btn_result_frame.pack(fill=tk.X, padx=5, pady=5)
        ttk.Button(btn_result_frame, text="开始比较", command=self.start_compare).pack(side=tk.LEFT, padx=5)
        self.compare_label = ttk.Label(btn_result_frame, textvariable=self.compare_result, foreground="blue")
        self.compare_label.pack(side=tk.LEFT, padx=10)

    # ---------- 单文件功能 ----------
    def select_file(self):
        path = filedialog.askopenfilename()
        if path:
            self.file_path.set(path)

    def start_calc(self):
        path = self.file_path.get()
        if not path:
            messagebox.showwarning("提示", "请先选择文件")
            return
        self.clear_result()
        self.progress['value'] = 0   # 重置进度条
        thread = threading.Thread(target=self.calc_hashes, args=(path,), daemon=True)
        thread.start()

    def calc_hashes(self, path):
        BUF_SIZE = 65536
        md5 = hashlib.md5()
        sha1 = hashlib.sha1()
        sha256 = hashlib.sha256()
        sha512 = hashlib.sha512()

        try:
            file_size = os.path.getsize(path)
            bytes_read = 0

            with open(path, 'rb') as f:
                while True:
                    data = f.read(BUF_SIZE)
                    if not data:
                        break
                    bytes_read += len(data)
                    md5.update(data)
                    sha1.update(data)
                    sha256.update(data)
                    sha512.update(data)
                    # 更新进度（百分比）
                    if file_size > 0:
                        percent = (bytes_read / file_size) * 100
                        self.root.after(0, self.update_progress, percent)
        except Exception as e:
            self.root.after(0, self.show_error, f"读取文件出错：{e}")
            return
        finally:
            self.root.after(0, self.finish_progress)

        filename = os.path.basename(path)
        result_lines = [
            f"文件名：{filename}",
            f"MD5:     {md5.hexdigest()}",
            f"SHA1:    {sha1.hexdigest()}",
            f"SHA256:  {sha256.hexdigest()}",
            f"SHA512:  {sha512.hexdigest()}"
        ]
        result_str = "\n".join(result_lines)
        self.root.after(0, self.display_result, result_str)

    def update_progress(self, percent):
        self.progress['value'] = percent

    def finish_progress(self):
        self.progress['value'] = 0

    def display_result(self, result_str):
        self.result_text.configure(state=tk.NORMAL)
        self.result_text.delete("1.0", tk.END)
        self.result_text.insert(tk.END, result_str)
        self.result_text.configure(state=tk.DISABLED)

    def show_error(self, msg):
        messagebox.showerror("错误", msg)
        self.progress['value'] = 0

    def copy_all(self):
        content = self.result_text.get("1.0", tk.END).strip()
        if content:
            self.root.clipboard_clear()
            self.root.clipboard_append(content)
            messagebox.showinfo("提示", "已复制到剪贴板")

    def clear_result(self):
        self.result_text.configure(state=tk.NORMAL)
        self.result_text.delete("1.0", tk.END)
        self.result_text.configure(state=tk.DISABLED)

    # ---------- 比较文件功能 ----------
    def select_compare_file(self, num):
        path = filedialog.askopenfilename()
        if path:
            if num == 1:
                self.file1_path.set(path)
            else:
                self.file2_path.set(path)

    def start_compare(self):
        f1 = self.file1_path.get()
        f2 = self.file2_path.get()
        if not f1 or not f2:
            messagebox.showwarning("提示", "请选择两个文件")
            return
        self.compare_result.set("正在比较...")
        thread = threading.Thread(target=self.compare_files, args=(f1, f2), daemon=True)
        thread.start()

    def compare_files(self, f1, f2):
        try:
            hash1 = self.get_sha256(f1)
            hash2 = self.get_sha256(f2)
            if hash1 == hash2:
                msg = f"相同\nSHA256: {hash1}"
            else:
                msg = f"不同\n文件1 SHA256: {hash1}\n文件2 SHA256: {hash2}"
            self.root.after(0, self.compare_result.set, msg)
        except Exception as e:
            self.root.after(0, self.compare_result.set, f"比较失败：{e}")

    @staticmethod
    def get_sha256(filepath):
        """计算文件的 SHA256 哈希值（分块读取）"""
        sha256 = hashlib.sha256()
        with open(filepath, 'rb') as f:
            for chunk in iter(lambda: f.read(65536), b''):
                sha256.update(chunk)
        return sha256.hexdigest()

if __name__ == "__main__":
    root = tk.Tk()
    app = HashTool(root)
    root.mainloop()