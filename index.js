const path = require('path');
express = require('express');
app = express();
const db = require('./database');
const Cookie = require('./bootlegcookie');

//Now equivalent of body parser
//app.use(cors());

const cookie = new Cookie();



app.set('view engine', 'ejs');
app.set('views',path.join(__dirname,'./views'))

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(express.static(path.join(__dirname,'public')));

app.post('/signup', (req,res)=>{
    const user = req.body;
    const who = Object.values(user)[0]
    if(who == 'Guest'){
        const query = "INSERT INTO guest(guest_id,password,first_name,last_name,email,address,phone_no) VALUES ($1,$2,$3,$4,$5,$6,$7)";
        const text = [user.username, user.password, user.first_name, user.last_name, user.email, user.address, user.phone_no];
        db.query(query,text, (err,result)=>{
            if (err){
                return console.error('Error executing query', err.stack);
            }
        })
    }else if(who == 'Host'){
        const query = "INSERT INTO host(host_id ,branch_id ,password ,first_name ,last_name ,email ,phone_no) VALUES ($1,$2,$3,$4,$5,$6,$7)";
        const text = [user.username ,user.branch_id ,user.password, user.first_name, user.last_name, user.email, user.phone_no];
        db.query(query,text, (err,result)=>{
            if (err){
                return console.error('Error executing query', err.stack);
            }
        })
    }else if(who == 'Employee'){
        const salary = Math.floor((Math.random() * 125000) + 70000); 
        const query = "INSERT INTO Employee(employee_id,password,first_name,last_name,email,branch_id,phone_no,salary,manager_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)";
        const text = [user.username, user.password, user.first_name, user.last_name, user.email, user.branch_id, parseInt(user.phone_no),salary,user.manager_id];
        db.query(query,text, (err,result)=>{
            if (err){
                return console.error('Error executing query', err.stack);
            }
        })
    }else{
        console.log("Who are you? You are not employee, guest or host loool")
    }
    console.log("User added to the database!");
    res.sendFile(path.join(__dirname,'/public/signin.html'));
});

app.post('/test', (req,res)=>{
    console.log(req.body);
});

app.post('/signin', (req,ress)=>{
    const user = req.body;
    const who = Object.values(user)[0]
    console.log(user);
    if(who == 'Guest'){
        const query ='SELECT * FROM guest where guest_id = $1 AND password = $2';
        const text = [user.username,user.password];
        db.query(query, text, (err,res)=>{
            if (err){
                return console.error('Error executing query', err.stack);
            }
    
            if (res.rowCount == 0){
                ress.status(404).send('Username not found or password is wrong. Signup or check password pls.')
            }else{
                
                //sets cookie to play with
                cookie.set(user.username,'guest');
                cookie.setfirstname(res.rows[0].first_name);
                //takes us to the users page
                ress.redirect('/user');
            }
        })
    }else if(who == 'Host'){
        const query ='SELECT * FROM host where host_id = $1 AND password = $2';
        const text = [user.username,user.password];
        db.query(query, text, (err,res)=>{
            if (err){
                return console.error('Error executing query', err.stack);
            }
    
            if (res.rowCount == 0){
                ress.status(404).send('Username not found or password is wrong. Signup or check password pls.')
            }else{
                cookie.set(user.username,'host');
                cookie.setfirstname(res.rows[0].first_name);
                //takes us to the users page
                ress.redirect('/host');
            }
        })
    }else if(who == 'Employee'){
        const query ='SELECT * FROM employee where employee_id = $1 AND password = $2';
        const text = [user.username,user.password];
        db.query(query, text, (err,res)=>{
            if (err){
                return console.error('Error executing query', err.stack);
            }
    
            if (res.rowCount == 0){
                ress.status(404).send('Username not found or password is wrong. Signup or check password pls.')
            }else{
                cookie.set(user.username,'employee');
                cookie.setfirstname(res.rows[0].first_name);
                cookie.setbranch(res.rows[0].branch_id);
                ress.redirect('/employee');
            }
        })
    }else{
        console.log("Who are you? You are not employee, guest or host loool")
    }
});

app.get('/signin', (req,res)=>{
    res.sendFile( path.join(__dirname,'public/signin.html')  );
})

//user api endpoints
app.get('/user', (req,res)=>{
    res.render('pages/user/user', {userfirstname: cookie.firstname});
});

//properties page
app.get('/user/properties', (req,res)=>{
    db.query('SELECT property_id,property_name FROM property', (err,result)=>{
        if (err){
            return console.error('Error executing query', err.stack);
        }
        res.render('pages/user/userpropintro', {properties: result.rows, message: "Select Property:"});
    });
});
app.get('/user/properties/:id', (req,res)=>{
    db.query('SELECT property_id,property_name FROM property', (err,result)=>{
        if (err){
            return console.error('Error executing query', err.stack);
        }

        db.query('SELECT * FROM property NATURAL JOIN host WHERE property_id=$1',[req.params.id], (err,rez)=>{
            if (err){
                return console.error('Error executing query', err.stack);
            }
            db.query('SELECT * FROM rentalagreement INNER JOIN review ON rentalagreement.booking_id = review.boooking_id WHERE property_id = $1',[req.params.id], (err,reZz)=>{
                res.render('pages/user/userproperties2', {properties: result.rows, info : rez.rows[0], review : reZz.rows, rec: reZz.rowCount });
            });
        });
    });
});

//my bookings page
app.get('/user/mybookings', (req,res)=>{
    db.query('SELECT * FROM rentalagreement NATURAL JOIN property WHERE guest_id = $1',[cookie.username], (err,result)=>{
        if (err) return console.error('Error executing query', err.stack);
        console.log(result.rows)
        res.render('pages/user/usermybookintro', {bookings: result.rows, message:"Select booking:"});
    })
});

//mightve fucked up something over here will check over later
app.get('/user/mybookings/:id', (req,res)=>{
    const q = "SELECT * FROM (SELECT * FROM rentalagreement WHERE booking_id = $1) A LEFT OUTER JOIN (SELECT * FROM property) B ON A.property_id = B.property_id LEFT OUTER JOIN (SELECT * FROM review) C ON A.booking_id = C.boooking_id";
    db.query('SELECT * FROM rentalagreement NATURAL JOIN property WHERE guest_id = $1',[cookie.username], (err,result)=>{
        if (err) return console.error('Error executing query', err.stack);
        db.query(q,[req.params.id], (err,rez)=>{
            if (err) return console.error('Error executing query', err.stack);
            console.log(rez.rows)
            res.render('pages/user/usermybook', {bookings: result.rows, info:rez.rows[0]});
        })
    })
});

// app.get('/user/cancelbook/:id', (req,res)=>{
//     db.query('SELECT booking_id, start_date FROM rentalagreement WHERE booking_id = $1', [req.params.id], (err,result)=>{
//         if (err){
//             return console.error('Error executing query', err.stack);
//         }
//         today = new Date();
//         date = result.rows[0].start_date;
//         console.log(today);
//         console.log(date);
//         console.log(date<today);
//         if(date<today){
//             res.send('You can not cancel a booking that has already passed its start date!')
//         }else{
//             db.query('DELETE FROM review WHERE boooking_id = $1', [req.params.id], (err,ree)=>{
//                 if (err){
//                     return console.error('Error executing query', err.stack);
//                 }
//             });

//             db.query('DELETE FROM rentalagreement WHERE booking_id = $1', [req.params.id], (err,ree)=>{
//                 if (err){
//                     return console.error('Error executing query', err.stack);
//                 }
//             });
            
//             res.redirect(`/user`);
//         }
//     });
// });

//my bookings page huuuuuuuuuuuh

app.post('/user/review/:id', (req,res)=>{
    db.query('SELECT * FROM rentalagreement INNER JOIN review ON rentalagreement.booking_id = review.boooking_id WHERE booking_id = $1',[req.params.id], (err,result)=>{
        if (err) return console.error('Error executing query', err.stack);
        if (result.rows.length != 0) {
            res.send('You already left a review.')
        }
        else{
            const query = 'INSERT INTO review(boooking_id,rating,comment) VALUES ($1,$2,$3)';
            const values = [req.params.id,req.body.rating,req.body.comment];
            db.query(query,values, (err,result)=>{
            if (err) return console.error('Error executing query', err.stack);
            res.redirect(`/user/mybookings/${req.params.id}`);
            });
        }
    });
    
});


//boooook now
app.get('/user/booknow', (req,res)=>{
    db.query('SELECT property_id,property_name FROM property', (err,result)=>{
        if (err){
            return console.error('Error executing query', err.stack);
        }
        res.render('pages/user/userbooknow', {properties: result.rows, rec: 0});
    });
});

app.get('/user/booknow/:id', (req,res)=>{
    db.query('SELECT property_id,property_name FROM property', (err,result)=>{
        if (err){
            return console.error('Error executing query', err.stack);
        }
        db.query('SELECT property_id,property_name FROM property where property_id=$1',[req.params.id], (err,rez)=>{
            if (err){
                return console.error('Error executing query', err.stack);
            }
            res.render('pages/user/userbooknow', {properties: result.rows, load:rez.rows, rec: 1});
        });
    });
});

app.post('/user/book/:id', (req,res)=>{
    console.log(req.params.id);
    console.log(req.body);

    flag = false;
    db.query("SELECT * FROM rentalagreement WHERE property_id = $1 and guest_id = $2 and start_date=$3 and end_date=$4", [req.params.id, cookie.username, req.body.start_date, req.body.end_date], (err,aaa)=>{

        if(aaa.rowCount == 0){
            db.query("SELECT * FROM payment ORDER BY payment_id", (err,result)=>{
                if (err) {
                    return console.error('Error executing query', err.stack)
                }
                const payment_id = result.rows[result.rowCount-1].payment_id + 1;
                db.query("INSERT INTO payment(payment_method,card_number) VALUES ($1,$2)",[req.body.Acc,parseInt(req.body.card_number)], (err,rez)=>{
                  if (err) {
                    return console.error('Error executing query', err.stack)
                  }
                  db.query("INSERT INTO rentalagreement(property_id,guest_id,payment_id,start_date,end_date) VALUES ($1,$2,$3,$4,$5)",[req.params.id, cookie.username, payment_id, req.body.start_date, req.body.end_date], (err,rezz)=>{
                    if (err) {
                      return console.error('Error executing query', err.stack)
                    }

                    res.redirect('/user/mybookings');
                  });
                });
            });
        }else{
            console.log('ALREADY!!');
        }
    });
});

app.get('/signout', (req,res)=>{
    cookie.clearconstructor();
    res.redirect('/signin');
});




//HOST
app.get('/host',(req,res)=>{
    res.render('pages/host/host', {userfirstname: cookie.firstname});
});

app.get('/host/reviews',(req,res)=>{
    db.query('SELECT property_id,property_name FROM property WHERE host_id = $1',[cookie.username], (err,result)=>{
        if (err){
            return console.error('Error executing query', err.stack);
        }
        res.render('pages/host/userrevintro', {properties: result.rows});
    });
});

app.get('/host/reviews/:id',(req,res)=>{
    db.query('SELECT property_id,property_name FROM property WHERE host_id = $1',[cookie.username], (err,result)=>{
        if (err){
            return console.error('Error executing query', err.stack);
        }

        db.query('SELECT * FROM property NATURAL JOIN host WHERE property_id=$1',[req.params.id], (err,rez)=>{
            if (err){
                return console.error('Error executing query', err.stack);
            }
            db.query('SELECT * FROM rentalagreement INNER JOIN review ON rentalagreement.booking_id = review.boooking_id WHERE property_id = $1',[req.params.id], (err,reZz)=>{
                res.render('pages/host/userreview', {properties: result.rows, info : rez.rows[0], review : reZz.rows, rec: reZz.rowCount });
            });
        });
    });
});

app.get('/host/mybookings',(req,res)=>{
    db.query('SELECT property_id,property_name FROM property WHERE host_id = $1',[cookie.username], (err,result)=>{
        if (err){
            return console.error('Error executing query', err.stack);
        }
        res.render('pages/host/hostmybook', {properties: result.rows});
    });
});

app.get('/host/mybookings/:id',(req,res)=>{
    db.query('SELECT property_id,property_name FROM property WHERE host_id = $1',[cookie.username], (err,result)=>{
        if (err){
            return console.error('Error executing query', err.stack);
        }
        db.query('SELECT * FROM review RIGHT OUTER JOIN rentalagreement ON review.boooking_id = rentalagreement.booking_id WHERE property_id = $1',[req.params.id], (err,rez)=>{
            if (err){
                return console.error('Error executing query', err.stack);
            }
            res.render('pages/host/hostmybookmain', {properties: result.rows, info:rez.rows, woo: rez.rowCount});
            console.log(rez.rows);
        });
    });
});

app.get('/host/cancelbooking/:id', (req,res)=>{
    db.query('SELECT booking_id, start_date FROM rentalagreement WHERE booking_id = $1', [req.params.id], (err,result)=>{
        if (err){
            return console.error('Error executing query', err.stack);
        }
        today = new Date();
        date = result.rows[0].start_date;
        console.log(today);
        console.log(date);
        console.log(date<today);
        if(date<today){
            res.send('You can not cancel a booking that has already passed its start date!')
        }else{
            db.query('DELETE FROM rentalagreement WHERE booking_id = $1', [req.params.id], (err,ree)=>{
                if (err){
                    res.send("You cant delete a rentalgreement that a review has been left for!")
                }
            });

            res.redirect(`/host/mybookings`);
        }
    });
});


app.get('/host/addprop',(req,res)=>{
    res.render('pages/host/hostaddprop');
});


app.post('/host/add', (req,res)=>{
    const who = req.body;
    console.log(who);
    const text = "INSERT INTO property(host_id,address,city,property_type,room_type,max_occupany,num_rooms,num_bathrooms,property_name,price) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)"
    const values = [cookie.username,who.address,who.city,who.ptype,who.rtype,who.max_occupancy,who.rooms,who.bathrooms,who.pname,who.price];

    db.query(text,values, (err,resz)=>{
        if (err){
            //res.send('Error executing query', err.stack);
            return console.error('Error executing query', err.stack);
        }

        res.redirect('/host/reviews');
    });

});

app.get('/employee', (req,res)=>{
    res.render('pages/employee/employee', {userfirstname: cookie.firstname});
});

app.get('/employee/guests',(req,res)=>{

    db.query("SELECT * FROM guest",(err,resz)=>{
        if (err){
            //res.send('Error executing query', err.stack);
            return console.error('Error executing query', err.stack);
        }

        res.render('pages/employee/empusersintro', {users : resz.rows});
    });
});


app.get('/employee/hosts',(req,res)=>{

    db.query("SELECT * FROM host where branch_id = $1",[cookie.branch],(err,resz)=>{
        if (err){
            //res.send('Error executing query', err.stack);
            return console.error('Error executing query', err.stack);
        }

        res.render('pages/employee/emphosts', {users : resz.rows});
    });
});


app.get('/employee/hosts/:id',(req,rez)=>{
    db.query('SELECT property_id,property_name FROM property WHERE host_id = $1',[req.params.id], (err,result)=>{
        if (err){
            return console.error('Error executing query', err.stack);
        }

        db.query('SELECT * FROM host WHERE host_id = $1',[req.params.id], (err,rz)=>{
            if (err){
                return console.error('Error executing query', err.stack);
            }
            console.log(result.rows);
            rez.render('pages/employee/emphostdetails', {info: rz.rows[0], prop: result.rows});
        });
    });
});

app.get('/employee/properties/:id', (req,res)=>{
    db.query('SELECT * FROM property WHERE property_id = $1',[req.params.id], (err,result)=>{
        if (err){
            return console.error('Error executing query', err.stack);
        }

        db.query('SELECT * FROM rentalagreement INNER JOIN review ON rentalagreement.booking_id = review.boooking_id WHERE property_id = $1 AND start_date < $2',[req.params.id,new Date()], (err,past)=>{
            if (err){
                return console.error('Error executing query', err.stack);
            }
            
            db.query('SELECT * FROM rentalagreement WHERE property_id = $1 AND start_date > $2',[req.params.id,new Date()], (err,future)=>{
                if (err){
                    return console.error('Error executing query', err.stack);
                }
                //console.log(rz.rows);
                res.render('pages/employee/empprop', {info: result.rows[0], past: past.rows, woo1: past.rowCount, woo2: future.rowCount, future: future.rows});
            });
        });
    });
});


app.get('/employee/cancelbooking/:id', (req,res)=>{  
    db.query('DELETE FROM rentalagreement WHERE booking_id = $1', [req.params.id], (err,ree)=>{
        if (err){
            return console.error('Error executing query', err.stack);
        }
    });
    res.redirect(`/employee/hosts`);
});











const PORT = process.env.port || 3000;

app.listen(PORT, ()=>{
    console.log(`listening at localhost:${PORT}`);
})