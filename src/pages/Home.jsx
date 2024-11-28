import NetworkPie from '../components/graph/NetworkPie';
import { data } from './data';

const Home = () => {
    return (
        <div className="flex pd-0" style={{ width: '100vw', height: '100vh' }}>
            {/* 왼쪽 2/3 영역 */}
            <div className="w-2/3 bg-blue-100 p-4">
                <NetworkPie data={data} />
            </div>

            {/* 오른쪽 1/3 영역 (내부적으로 다시 2/3, 1/3으로 분할) */}
            <div className="w-1/3 flex flex-col">
                {/* 오른쪽 위 2/3 영역 */}
                <div className="flex-2/3 bg-green-100 p-4" style={{ height: '600px' }}></div>

                {/* 오른쪽 아래 1/3 영역 */}
                <div className="flex-1/3 bg-red-100 p-4" style={{ height: '300px' }}></div>
            </div>
        </div>
    );
};

export default Home;
