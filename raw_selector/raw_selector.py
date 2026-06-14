# raw_selector.py
import os
import shutil
import tkinter as tk
from tkinter import filedialog
# from tkinter import messagebox
import time

class MessageWindow(tk.Toplevel):
    def Get_Geometry_XY_String(self,self_width, self_height, win_width, win_height, win_x, win_y, win_position):
        s_w = self_width
        s_h = self_height
        w = win_width
        h = win_height
        x = win_x
        y = win_y
        result_x = 0
        result_y = 0
        result_str = ""
        position = win_position
        if position == 'CENTER' or position == 'center' or position == 'c':
            result_x = x + (w//2 - s_w//2)
            result_y = y + (h//2 - s_h//2)

        elif position == 'NW' or position == 'nw':
            result_x = x
            result_y = y

        elif position == 'N' or position == 'n':
            result_x = x + (w//2 - s_w//2)
            result_y = y

        elif position == 'NE' or position == 'ne':
            result_x = x + w - s_w
            result_y = y

        elif position == 'E' or position == 'e':
            result_x = x + w - s_w
            result_y = y + (h//2 - s_h//2)

        elif position == 'SE' or position == 'se':
            result_x = x + w - s_w
            result_y = y + h - s_h

        elif position == 'S' or position == 's':
            result_x = x + (w//2 - s_w//2)
            result_y = y + h - s_h

        elif position == 'SW' or position == 'sw':
            result_x = x
            result_y = y + h - s_h

        elif position == 'W' or position == 'w':
            result_x = x
            result_y = y + (h//2 - s_h//2)
                                 
        result_str = f"{str(s_w)}x{str(s_h)}+{str(result_x)}+{str(result_y)}"
        return result_str


    
    def show_wait_window(self):
        self.grab_set()
        self.protocol("WM_DELETE_WINDOW", self.destroy)
        self.master.wait_window(self)
        self.grab_release()
        
    def __init__(self, title, message):
        super().__init__()
        self.details_expanded = False
        self.title(title)
        
        geostring = self.Get_Geometry_XY_String(330,
                                                150,
                                                self.master.winfo_width(),
                                                self.master.winfo_height(),
                                                self.master.winfo_x(), 
                                                self.master.winfo_y(),
                                                'center')

        
        self.geometry(geostring)
        self.resizable(False, False)
        
        frame1 = tk.Frame(self,bg='white')
        frame1.pack(side=tk.TOP, fill=tk.BOTH)
        frame1.pack_propagate(False)
        frame1.configure(width=320, height=100)
        frame2 = tk.Frame(self)
        frame2.pack(side=tk.BOTTOM, fill=tk.BOTH)
        frame2.pack_propagate(False)
        frame2.configure(width=320, height=50)
        
        label_icon = tk.Label(frame1, image="::tk::icons::question", bg='white')
        label_icon.pack(side=tk.LEFT, pady=(10, 10), padx=(20, 10), anchor=tk.W)
        
        label_info = tk.Label(frame1, text=message, wraplength=200, pady=5, justify=tk.LEFT,bg='white')
        label_info.pack(side=tk.LEFT, pady=(10, 10), padx=(10, 10),anchor=tk.W)
        
        button = tk.Button(frame2, text="确定", width=10, command=self.destroy)
        button.pack(side=tk.TOP, pady=(10, 10), padx=(10, 10),anchor=tk.CENTER)
        # tk.Button(self, text="Cancel", command=self.destroy).grid(row=1, column=2, padx=(7, 7), sticky="e")
        self.show_wait_window()
        


class GUI(tk.Tk):
    def __init__(self):
        super().__init__()
        self.geometry("300x224")
        self.resizable(0, 0)
        self.protocol("WM_DELETE_WINDOW", self.exit_window)

    def yes_exit(self):
        print("do other stuff here then self.destroy")
        self.destroy()

    def exit_window(self):
        top = tk.Toplevel(self)
        top.details_expanded = False
        top.title("Quit")
        top.geometry("300x100+{}+{}".format(self.winfo_x(), self.winfo_y()))
        top.resizable(False, False)
        top.rowconfigure(0, weight=0)
        top.rowconfigure(1, weight=1)
        top.columnconfigure(0, weight=1)
        top.columnconfigure(1, weight=1)
        tk.Label(top, image="::tk::icons::question").grid(row=0, column=0, pady=(7, 0), padx=(7, 7), sticky="e")
        tk.Label(top, text="Are you sure you want to quit?").grid(row=0, column=1, columnspan=2, pady=(7, 7), sticky="w")
        tk.Button(top, text="OK", command=self.yes_exit).grid(row=1, column=1, sticky="e")
        tk.Button(top, text="Cancel", command=top.destroy).grid(row=1, column=2, padx=(7, 7), sticky="e")

class My_Window:
    def __init__(self, master):
        self.master = master
        self.master.title("文件批量移动器")
        self.master.geometry("1024x768+100+100")
        self.master.resizable(False, False)
    
    def create_widgets(self):
        root = self.master

        self.reference_folder_var = tk.StringVar()
        "参考文件夹路径Var"
        self.raw_folder_var = tk.StringVar()
        "需要移动的文件夹路径Var"
        self.target_folder_var = tk.StringVar()
        "目标文件夹路径Var"
        self.file_list = []
        "选中图片文件列表"
        # self.listbox_var = tk.Variable(value=self.file_list)
        self.listbox_var = tk.StringVar(value=self.file_list)
        "Listbox内容Var"
        self.info_listbox_label_var = tk.StringVar()
        "文件列表标签Var"
        self.info_label_var = tk.StringVar()
        "右侧信息标签Var"
        
        self.root_win_po_x = self.master.winfo_x()
        self.root_win_po_y = self.master.winfo_y()
        self.root_win_width = self.master.winfo_width()
        self.root_win_height = self.master.winfo_height()


        self.Frame0 = tk.Frame(root)
        self.Frame0.pack(side=tk.TOP, fill=tk.BOTH, padx=5, pady=10, anchor=tk.NW)
        
        self.Frame1 = tk.Frame(self.Frame0)
        self.Frame1.pack(side=tk.LEFT, fill=tk.BOTH, padx=5, pady=5, anchor=tk.NW)
        self.Frame1.pack_propagate(False)
        self.Frame1.configure(width=500, height=760)

        #需要移动的文件夹控件们
        self.source_LabelFrame = tk.LabelFrame(self.Frame1, bd=2, relief=tk.GROOVE, text="需要移动的文件夹")
        self.source_LabelFrame.pack(side=tk.TOP, fill='x', padx=5, pady=5, expand=False, anchor=tk.NW)

        self.raw_button = tk.Button(self.source_LabelFrame, text="选择源文件夹", width=20, command=self.raw_button_clicked)
        self.raw_button.pack(side=tk.LEFT, padx=5, pady=5)
        
        self.raw_entry = tk.Entry(self.source_LabelFrame, width=50, textvariable=self.raw_folder_var)
        self.raw_entry.pack(side=tk.LEFT, padx=5, pady=5)  

        #移动目标文件夹控件们
        self.target_LabelFrame = tk.LabelFrame(self.Frame1, bd=2, relief=tk.GROOVE, text="目标文件夹")
        self.target_LabelFrame.pack(side=tk.TOP, fill=tk.X, padx=5, pady=5, expand=False, anchor=tk.NW)
        
        self.target_button = tk.Button(self.target_LabelFrame, text="选择目标文件夹", width = 20, command=self.target_button_clicked)
        self.target_button.pack(side=tk.LEFT, padx=5, pady=5)
        self.target_entry = tk.Entry(self.target_LabelFrame, width=50, textvariable = self.target_folder_var)
        self.target_entry.pack(side=tk.LEFT, padx=5, pady=5)

        #文件列表控件们
        #文件列表-标签框
        self.file_list_LabelFrame = tk.LabelFrame(self.Frame1, bd=2, relief=tk.GROOVE, text="文件列表")
        self.file_list_LabelFrame.pack(side=tk.TOP, fill=tk.BOTH, padx=5, pady=5, expand=True, anchor=tk.NW)
        
        self.file_list_little_frame1 = tk.Frame(self.file_list_LabelFrame)
        self.file_list_little_frame1.pack(side=tk.TOP, fill=tk.BOTH, padx=0, pady=0, expand=True, anchor=tk.NW)
        #文件列表-配套滚动条
        self.scrollbar = tk.Scrollbar(self.file_list_little_frame1)  # 创建滚动条
        self.scrollbar.pack(side=tk.RIGHT, fill=tk.BOTH)
        #文件列表-列表
        self.file_list_listbox = tk.Listbox(self.file_list_little_frame1, listvariable=self.listbox_var, selectmode=tk.EXTENDED, yscrollcommand=self.scrollbar.set)
        self.file_list_listbox.pack(side=tk.LEFT, fill=tk.BOTH, padx=5, pady=5, expand=True)
        
        self.scrollbar.config(command=self.file_list_listbox.yview)
        #绑定选中事件
        self.file_list_listbox.bind("<<ListboxSelect>>", self.on_file_listbox_selected)
        #文件列表-标签信息
        self.file_list_little_frame2 = tk.Frame(self.file_list_LabelFrame)
        self.file_list_little_frame2.pack(side=tk.TOP, fill=tk.X, padx=0, pady=0, expand=False, anchor=tk.NW)        
        self.info_listbox_label = tk.Label(self.file_list_little_frame2, textvariable=self.info_listbox_label_var)
        self.info_listbox_label.pack(side=tk.BOTTOM, padx=0, pady=2, anchor=tk.S)
        self.info_listbox_label_var.set("欢迎使用文件批量移动器。")

        #右侧Frame
        self.Frame2 = tk.Frame(self.Frame0)
        self.Frame2.pack(side=tk.RIGHT, fill=tk.BOTH, padx=5, pady=5, anchor=tk.NW)
        self.Frame2.pack_propagate(False)
        self.Frame2.configure(width=500, height=760)
        
        #筛选器控件们
        self.filter_LabelFrame = tk.LabelFrame(self.Frame2, bd=2, relief=tk.GROOVE, text="筛选器")
        self.filter_LabelFrame.pack(side=tk.TOP, fill=tk.Y, padx=5, pady=5, expand=False, anchor=tk.NW)

        #筛选器框架1
        self.filter_frame1 = tk.Frame(self.filter_LabelFrame)
        self.filter_frame1.pack(side=tk.TOP, fill=tk.X, padx=5, pady=5, anchor=tk.NW)

        self.filter_through_folder_button = tk.Button(self.filter_frame1, text="通过文件夹筛选", width=20, command=self.filter_through_folder_button_clicked)
        self.filter_through_folder_button.pack(side=tk.LEFT, padx=5, pady=5)

        self.reference_entry = tk.Entry(self.filter_frame1, width=50, textvariable=self.reference_folder_var)
        self.reference_entry.pack(side=tk.LEFT, padx=5, pady=5)

        #筛选器框架2
        self.filter_frame2 = tk.Frame(self.filter_LabelFrame)
        self.filter_frame2.pack(side=tk.TOP, fill=tk.X, padx=5, pady=5, anchor=tk.NW)

        #用来文本筛选的按钮
        self.filter_with_texts_button = tk.Button(self.filter_frame2, text="通过文本筛选", width=20, command=self.filter_with_texts_button_clicked)
        self.filter_with_texts_button.pack(side=tk.LEFT, padx=5, pady=5, anchor=tk.NW)

        #用来文本筛选的文本框
        self.filter_with_texts_text = tk.Text(self.filter_frame2, width=50, height=15 )
        self.filter_with_texts_text.pack(side=tk.LEFT, fill='y', padx=5, pady=5, anchor=tk.NW)


        #移动按钮框架
        self.move_botton_frame = tk.Frame(self.Frame2)
        self.move_botton_frame.pack(side=tk.TOP, fill=tk.BOTH, padx=5, pady=5, expand=False, anchor=tk.NW)

        self.move_botton = tk.Button(self.move_botton_frame, text="移动文件", width = 20, command=self.move_files)
        self.move_botton.pack(side=tk.TOP, padx=5, pady=5, anchor=tk.CENTER)


        #信息日志控件们
        self.info_LabelFrame = tk.LabelFrame(self.Frame2, bd=2, relief=tk.GROOVE, text="信息日志")
        self.info_LabelFrame.pack(side=tk.TOP, fill=tk.BOTH, padx=5, pady=5, expand=True, anchor=tk.NW)
        
        self.log_data_Text = tk.Text(self.info_LabelFrame, width=66, height=20)  # 日志框
        self.log_data_Text.pack(side=tk.TOP, fill=tk.BOTH, padx=5, pady=5, expand=True, anchor=tk.NW)

        #信息标签
        self.info_label = tk.Label(self.info_LabelFrame, textvariable=self.info_label_var)
        self.info_label.pack(side=tk.TOP, padx=5, pady=5, anchor=tk.S)


        # #下侧Frame
        # self.info_Frame = tk.Frame(root)
        # self.info_Frame.pack(side=tk.BOTTOM, fill=tk.BOTH, padx=5, pady=5, expand=True)
      


    def on_file_listbox_selected(self, *args):
        size = self.file_list_listbox.size()
        if size > 0:
            selected_indexes = self.file_list_listbox.curselection()
            size = len(selected_indexes)
            file_selected = []
            files = self.file_list
            if len(files)>0:
                for i in selected_indexes:
                    file_selected.append(files[i])
                self.fill_Textbox(file_selected)
                self.info_label_var.set(f"{len(file_selected)} 个文件被选中。")

    def filter_through_folder_button_clicked(self):    
        #通过文件夹进行筛选
        dir_path = self.load_directory()
        if dir_path:
            if not os.path.exists(dir_path): #检查源文件夹是否存在
                MessageWindow("提示", "文件夹不存在，请检查路径。")
                return
            else:                
                self.reference_folder_var.set(dir_path + os.sep)
                files_ref = self.get_all_files(dir_path)

                self.fill_Textbox(files_ref)
                info_string = f"共找到 {len(files_ref)} 个文件。"
                
                select_files = self.select_files_in_filelist(files_ref)
                info_string += f"有 {len(select_files)} 个文件被选中。"
                
                self.info_label_var.set(info_string)
                
  

    def filter_with_texts_button_clicked(self):    
        #根据文本语句进行筛选
        select_string = self.filter_with_texts_text.get('1.0',tk.END)
        files = self.string_to_list(select_string)
        info_string = f"需要筛选 {len(files)} 个文件。"
        select_files = self.select_files_in_filelist(files)
        info_string += f"有 {len(select_files)} 个文件被选中。"        
        self.info_label_var.set(info_string)
            
            
            
    def string_to_list(self, string):
        return [line for line in string.splitlines() if line.strip()]
             

    def raw_button_clicked(self):    
        #设置源文件夹
        dir_path = self.load_directory()
        if dir_path:
            self.raw_folder_var.set(dir_path + os.sep)
            # files = self.get_all_files(dir_path)
            # self.fill_listbox(files)
            # self.info_listbox_label_var.set(f"共找到 {len(files)} 个文件。")
            self.refresh_raw_folder_listbox()

    def refresh_raw_folder_listbox(self):
        dir_path = self.raw_folder_var.get()
        if dir_path:
            items = os.listdir(dir_path)
            files = []
            for item in items:
                item_path = os.path.join(dir_path, item)
                if os.path.isfile(item_path):
                    basename, ext = os.path.splitext(item)
                    files.append(basename)
            self.fill_listbox(files)
            self.file_list_listbox.selection_clear(0, tk.END)
            self.info_listbox_label_var.set(f"共找到 {len(files)} 个文件。")
               

    def target_button_clicked(self):    
        #设置目标文件夹
        dir_path = self.load_directory()
        if dir_path:
            self.target_folder_var.set(dir_path + os.sep)


    def get_all_files(self, directory):
        #定义一个空列表，用于存储所有文件路径
        filelist = []
        #使用os.walk遍历文件夹
        for root, dirs, files in os.walk(directory):
            for file in files: 
                #将文件的完整路径添加到列表中
                basename, ext = os.path.splitext(file)
                filelist.append(basename)
        #返回文件列表
        return filelist
    
    def fill_listbox(self, files):
        #填充列表控件
        listbox = self.file_list
        if len(listbox) > 0:
            listbox.clear()
        if len(files) > 0:
            for file in files:
                listbox.append(file)
        self.listbox_var.set(listbox) 
 
    def select_files_in_filelist(self, files):
        listbox = self.file_list
        selected = []
        for file in files:
            if file in listbox:
                i = listbox.index(file)
                selected.append(file)
                self.file_list_listbox.selection_set(i)
        return selected        
                             
    def fill_Textbox(self, files):
        self.filter_with_texts_text.delete('1.0', tk.END)
        for file in files:
            self.filter_with_texts_text.insert(tk.END, str(file) + "\n")

        
    def move_files(self):
        # 读取源文件夹路径
        raw_dir = self.raw_folder_var.get()
        if raw_dir == "":
            MessageWindow("提示","需要移动的文件夹路径不能为空，请检查路径。")
            # ms.show_wait_window()
            # messagebox.showinfo(title="提示", message="需要移动的文件夹路径不能为空，请检查路径。", parent=self.master)
            return

        if not os.path.exists(raw_dir):
            MessageWindow("提示", "需要移动的文件夹路径不存在，请检查路径。")
            # self.master.wait_window(ms)
            return
        
        # 读取目标文件夹路径
        target_dir = self.target_folder_var.get()
        if target_dir == "":
            MessageWindow("提示", "目标文件夹路径不能为空，请检查路径。")
            # self.master.wait_window(ms)
            return
        
        if not os.path.exists(target_dir):
            os.makedirs(target_dir)
            MessageWindow("提示", f"目标文件夹路径不存在，已创建：{target_dir}")
            # self.master.wait_window(ms)

        if raw_dir == target_dir:
            MessageWindow("提示", "源文件夹路径和目标文件夹路径不能相同，请更换路径。")
            # self.master.wait_window(ms)
            return
        # 检查参考文件夹路径        
        ref_dir = self.reference_folder_var.get()
        if target_dir == ref_dir:
            MessageWindow("提示", "目标文件夹与参考的文件夹路径不能相同，请更换路径。")
            # self.master.wait_window(ms)
            return
        if raw_dir == ref_dir:
            MessageWindow("提示", "源文件夹与参考的文件夹路径不能相同，请更换路径。")
            # self.master.wait_window(ms)
            return
        
        # 获取源文件夹中的所有文件
        raw_files = os.listdir(raw_dir)

        if len(raw_files) == 0:
            MessageWindow("提示", "需要移动的源路径下没有文件，请检查路径。")
            
            return
        # 获取选中的文件
        selected_files_index = self.file_list_listbox.curselection()
        if len(selected_files_index) == 0:
            MessageWindow("提示", "没有选中任何文件，请先选中需要移动的文件。")
            
            return
        selected_files = [self.file_list[i] for i in selected_files_index]
        moved_files = []
        skipped_files = []

        for file_name in raw_files:
            basename, ext = os.path.splitext(file_name)
            #检查文件是否在选中图片列表中
            if basename in selected_files:
                #构建完整的源文件路径和目标文件路径
                source_file_path = os.path.join(raw_dir, file_name)
                target_file_path = os.path.join(target_dir, file_name)
                #移动文件到目标文件夹
                try:
                    shutil.move(source_file_path, target_file_path)
                except OSError as e:
                    self.write_log_to_Text(f"Error moving {file_name}: {e}")
                    continue
                moved_files.append(file_name)
                self.file_list.remove(basename)
                self.write_log_to_Text(f"Moved: {file_name} to {target_dir}")
            else:
                skipped_files.append(file_name)
                # self.write_log_to_Text(f"Skipped: {file_name}")

        # self.info_label_var.set(f"文件移动完成。已移动文件数: {len(moved_files)}, 跳过文件数: {len(skipped_files)}")
        self.info_label_var.set(f"文件移动完成。已移动文件数: {len(moved_files)}。")
        self.refresh_raw_folder_listbox()

    #获取当前时间
    def get_current_time(self):
        current_time = time.strftime('%Y-%m-%d %H:%M:%S',time.localtime(time.time()))
        return current_time
    
    #日志动态打印
    def write_log_to_Text(self,logmsg):
        LOG_LINE_NUM = self.log_data_Text.get(1.0,tk.END).count("\n")
        current_time = self.get_current_time()
        logmsg_in = str(current_time) +" " + str(logmsg) + "\n"      #换行
        if LOG_LINE_NUM <= 10:
            self.log_data_Text.insert(1.0, logmsg_in)
            LOG_LINE_NUM = LOG_LINE_NUM + 1
        else:
            i = str(LOG_LINE_NUM -1)+".0"
            self.log_data_Text.delete(i, tk.END)
            self.log_data_Text.insert(1.0, logmsg_in)

    def load_file(self):
        file_path = filedialog.askopenfilename()
        if file_path:
            return file_path
        return None

    def load_directory(self):
        dir_path = filedialog.askdirectory()
        if dir_path: 
            dir_path = dir_path.replace("/","\\")       
            return dir_path
        return None
    
    
if __name__ == "__main__":
    root = tk.Tk()
    
    app = My_Window(root)
    app.create_widgets()
       
    root.mainloop()
    

    