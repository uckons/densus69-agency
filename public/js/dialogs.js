(() => {
    const defaults = {confirmButtonColor:'#6d28d9',cancelButtonColor:'#64748b'};
    window.showNotice = (message, type='info') => Swal.fire({
        ...defaults, icon:type, title:({success:'Berhasil',error:'Gagal',warning:'Perhatian',info:'Informasi'})[type] || 'Informasi',
        text:String(message), confirmButtonText:'OK'
    });
    window.showToast = (message, type='info') => Swal.fire({
        ...defaults, toast:true, position:'top-end', icon:type, text:String(message),
        showConfirmButton:false, timer:4500, timerProgressBar:true,
        didOpen:toast=>{toast.addEventListener('mouseenter',Swal.stopTimer);toast.addEventListener('mouseleave',Swal.resumeTimer);}
    });
    window.confirmAction = async message => (await Swal.fire({
        ...defaults, icon:'warning', title:'Konfirmasi', text:String(message),
        showCancelButton:true, confirmButtonText:'Ya, lanjutkan', cancelButtonText:'Batal', focusCancel:true
    })).isConfirmed;
    window.promptAction = async (message, {required=false,maxLength=1000}={}) => {
        const result = await Swal.fire({
            ...defaults, title:String(message), input:'textarea', inputAttributes:{maxlength:String(maxLength)},
            showCancelButton:true, confirmButtonText:'Simpan', cancelButtonText:'Batal',
            inputValidator:value=>required && !value.trim() ? 'Kolom ini wajib diisi' : undefined
        });
        return result.isConfirmed ? result.value : null;
    };
})();
