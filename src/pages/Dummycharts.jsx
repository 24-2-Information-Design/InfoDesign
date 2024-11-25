import Barcharts from '../components/Barcharts';
import NetworkPie from '../components/graph/NetworkPie';
import { data, links } from './data';

const Dummycharts = () => {
    return (
        <div className="flex flex-row gap-4 p-4">
            {/* 네트워크 파이 차트 */}
            <div className="w-1/2 bg-white p-4 rounded-lg shadow-md">
                <h2 className="text-lg font-bold mb-4">Network Pie Chart</h2>
                <NetworkPie data={data} links={links} />
            </div>

            {/* 스택형 바 차트 */}
            <div className="w-2/3 bg-white p-4 rounded-lg shadow-md">
                <h2 className="text-lg font-bold mb-4">Stacked Bar Chart</h2>
                <Barcharts data={data} />
            </div>
        </div>
    );
};

export default Dummycharts;
